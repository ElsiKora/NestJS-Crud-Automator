import "reflect-metadata";

import type { INestApplication, Type } from "@nestjs/common";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { DataSourceOptions } from "typeorm";

import { Inject, Injectable, Module } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { InjectRepository, TypeOrmModule } from "@nestjs/typeorm";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { Column, DataSource, Entity, PrimaryColumn, Repository } from "typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiController, ApiPropertyDescribe, ApiService, ApiServiceBase, ApiSubscriberModule, AuthorizationResolveDefaultPrincipal, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "../../src/index";

const describeString: PropertyDecorator = ApiPropertyDescribe({ description: "text", exampleValue: "value", format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING });
const disabled = { generation: { isEnabled: false } };

interface IEmbeddedKeyFixture {
	controller: Type<unknown>;
	entity: Type<object>;
	service: Type<unknown>;
}

/**
 * Builds an entity whose primary key is a top-level id and a date and time column inside an embedded property, beside a top-level text column of the same name.
 * @param {boolean} isPostgres - Whether the database fills the embedded key with microseconds, as PostgreSQL does, instead of the body sending it.
 * @returns {IEmbeddedKeyFixture} Entity, service and controller.
 */
function createFixture(isPostgres: boolean): IEmbeddedKeyFixture {
	class EmbeddedKey {
		@PrimaryColumn(isPostgres ? { default: () => "clock_timestamp()", type: "timestamptz" } : { type: "datetime" })
		public at!: Date;
	}

	@Entity(isPostgres ? "create_embedded_key_pg" : "create_embedded_key_sqlite")
	class EmbeddedKeyEntity {
		@describeString
		@PrimaryColumn({ type: "varchar" })
		public id!: string;

		@ApiPropertyDescribe({ dataType: EmbeddedKey, description: "key", type: EApiPropertyDescribeType.OBJECT } as never)
		@Column(() => EmbeddedKey)
		public key!: EmbeddedKey;

		@describeString
		@Column({ type: "varchar" })
		public at!: string;
	}

	@Injectable()
	@ApiService({ entity: EmbeddedKeyEntity })
	class EmbeddedKeyService extends ApiServiceBase<EmbeddedKeyEntity> {
		@InjectRepository(EmbeddedKeyEntity)
		public readonly repository!: Repository<EmbeddedKeyEntity>;
	}

	@ApiController<EmbeddedKeyEntity>({ entity: EmbeddedKeyEntity, name: "embedded-keys", path: "embedded-keys", routes: { [EApiRouteType.CREATE]: {}, [EApiRouteType.DELETE]: disabled, [EApiRouteType.GET]: disabled, [EApiRouteType.GET_LIST]: disabled, [EApiRouteType.PARTIAL_UPDATE]: disabled, [EApiRouteType.UPDATE]: disabled } as never })
	class EmbeddedKeyController {
		@Inject(EmbeddedKeyService)
		public readonly service!: EmbeddedKeyService;
	}

	return { controller: EmbeddedKeyController, entity: EmbeddedKeyEntity, service: EmbeddedKeyService };
}

async function createApp(fixture: IEmbeddedKeyFixture, options: DataSourceOptions): Promise<INestApplication> {
	@Module({ controllers: [fixture.controller], imports: [TypeOrmModule.forRoot({ ...options, dropSchema: true, entities: [fixture.entity], logging: false, synchronize: true } as DataSourceOptions), TypeOrmModule.forFeature([fixture.entity]), ApiAuthorizationModule.forRoot({ principalResolver: { resolve: (user: unknown) => AuthorizationResolveDefaultPrincipal(user as never) } } as never), ApiSubscriberModule], providers: [fixture.service] })
	class EmbeddedKeyModule {}

	const moduleRef = await Test.createTestingModule({ imports: [EmbeddedKeyModule] }).compile();
	const app: INestApplication = moduleRef.createNestApplication(new FastifyAdapter());

	await app.init();

	return app;
}

async function post(app: INestApplication, payload: object): Promise<number> {
	const response: { statusCode: number } = await app.getHttpAdapter().getInstance().inject({ method: "POST", payload, url: "/embedded-keys" });

	return response.statusCode;
}

describe("Generated CREATE with a date and time key inside an embedded property (E2E)", () => {
	describe("on better-sqlite3, with the key from the body", () => {
		const fixture: IEmbeddedKeyFixture = createFixture(false);
		let app: INestApplication;

		beforeAll(async () => {
			app = await createApp(fixture, { database: ":memory:", type: "better-sqlite3" });
		});

		afterAll(async () => {
			await app?.close();
		});

		it("reads the created row back by its whole millisecond and leaves the top-level property of the same name alone", async () => {
			expect(await post(app, { at: "free text", id: "row-1", key: { at: "2024-01-02T03:04:05.678Z" } })).toBe(201);
			expect(await app.get(DataSource).getRepository(fixture.entity).countBy({ id: "row-1" })).toBe(1);
		});
	});

	describe("on PostgreSQL", () => {
		const fixture: IEmbeddedKeyFixture = createFixture(true);
		let app: INestApplication;
		let container: StartedPostgreSqlContainer;

		beforeAll(async () => {
			container = await new PostgreSqlContainer("postgres:17-alpine").start();
			app = await createApp(fixture, { database: container.getDatabase(), host: container.getHost(), password: container.getPassword(), port: container.getPort(), type: "postgres", username: container.getUsername() });
		}, 180_000);

		afterAll(async () => {
			await app?.close();
			await container?.stop();
		}, 60_000);

		it("reads the created row back when the database fills the key with microseconds", async () => {
			expect(await post(app, { at: "free text", id: "row-1" })).toBe(201);
			expect(await app.get(DataSource).getRepository(fixture.entity).countBy({ id: "row-1" })).toBe(1);
		});

		it("parses the key from the body by its property path and leaves the top-level property of the same name alone", async () => {
			expect(await post(app, { at: "free text", id: "row-2", key: { at: "2024-01-02T03:04:05.678+05:30" } })).toBe(201);
			expect(await app.get(DataSource).getRepository(fixture.entity).countBy({ id: "row-2" })).toBe(1);
		});

		it("refuses a key from the body without a zone, naming its property path", async () => {
			const response: { body: string; statusCode: number } = await app
				.getHttpAdapter()
				.getInstance()
				.inject({ method: "POST", payload: { at: "free text", id: "row-3", key: { at: "2024-01-02T03:04:05.678" } }, url: "/embedded-keys" });

			expect(response.statusCode).toBe(400);
			expect(response.body).toContain("key.at");
			expect(await app.get(DataSource).getRepository(fixture.entity).countBy({ id: "row-3" })).toBe(0);
		});
	});
});
