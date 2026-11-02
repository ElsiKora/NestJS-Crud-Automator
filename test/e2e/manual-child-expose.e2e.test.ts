import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type { Repository } from "typeorm";

import { Inject, Injectable, ValidationPipe } from "@nestjs/common";
import { APP_PIPE } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { getRepositoryToken, InjectRepository, TypeOrmModule } from "@nestjs/typeorm";
import { Exclude, Expose } from "class-transformer";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiController, ApiPropertyDescribe, ApiPropertyString, ApiService, ApiServiceBase, ApiSubscriberModule, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "../../src/index";

class E2eManualChildEntityReference {}

const STRING_OPTIONS = { entity: E2eManualChildEntityReference, exampleValue: "first", format: EApiPropertyStringType.STRING, maxLength: 20, minLength: 1, pattern: "/^.+$/" };

class E2eManualChildSecretDto {
	@ApiPropertyString({ ...STRING_OPTIONS, description: "open", isRequired: true })
	public open!: string;

	@ApiPropertyString({ ...STRING_OPTIONS, description: "secret", isRequired: false })
	@Exclude()
	public secret?: string;
}

class E2eManualChildNamedDto {
	@ApiPropertyString({ ...STRING_OPTIONS, description: "childValue", isRequired: true })
	@Expose({ name: "child_wire" })
	public childValue!: string;
}

const GENERATED_ROUTES = {
	[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
	[EApiRouteType.GET_LIST]: { generation: { isEnabled: false } },
	[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
	[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
};

@Entity("e2e_manual_child_secret_rows")
class E2eManualChildSecretEntity {
	@ApiPropertyDescribe({ description: "manualChildSecretId", type: EApiPropertyDescribeType.UUID })
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@ApiPropertyDescribe({ dataType: E2eManualChildSecretDto, description: "manualChildSecretBody", shouldValidateNested: true, type: EApiPropertyDescribeType.OBJECT })
	@Column({ type: "simple-json" })
	public body!: E2eManualChildSecretDto;
}

@Entity("e2e_manual_child_named_rows")
class E2eManualChildNamedEntity {
	@ApiPropertyDescribe({ description: "manualChildNamedId", type: EApiPropertyDescribeType.UUID })
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@ApiPropertyDescribe({ dataType: E2eManualChildNamedDto, description: "manualChildNamedDetails", shouldValidateNested: true, type: EApiPropertyDescribeType.OBJECT })
	@Column({ type: "simple-json" })
	public details!: E2eManualChildNamedDto;
}

@Injectable()
@ApiService({ entity: E2eManualChildSecretEntity })
class E2eManualChildSecretService extends ApiServiceBase<E2eManualChildSecretEntity> {
	@InjectRepository(E2eManualChildSecretEntity)
	public readonly repository!: Repository<E2eManualChildSecretEntity>;
}

@Injectable()
@ApiService({ entity: E2eManualChildNamedEntity })
class E2eManualChildNamedService extends ApiServiceBase<E2eManualChildNamedEntity> {
	@InjectRepository(E2eManualChildNamedEntity)
	public readonly repository!: Repository<E2eManualChildNamedEntity>;
}

@ApiController<E2eManualChildSecretEntity>({ entity: E2eManualChildSecretEntity, name: "E2eManualChildSecrets", path: "manual-child-secrets", routes: GENERATED_ROUTES })
class E2eManualChildSecretController {
	public constructor(@Inject(E2eManualChildSecretService) public readonly service: E2eManualChildSecretService) {}
}

@ApiController<E2eManualChildNamedEntity>({ entity: E2eManualChildNamedEntity, name: "E2eManualChildNamed", path: "manual-child-named", routes: GENERATED_ROUTES })
class E2eManualChildNamedController {
	public constructor(@Inject(E2eManualChildNamedService) public readonly service: E2eManualChildNamedService) {}
}

describe("generated copy of a manual child DTO (E2E)", () => {
	let app: INestApplication | undefined;
	let fastify: { inject: (options: { method: string; payload?: unknown; url: string }) => Promise<{ json: () => Record<string, unknown>; statusCode: number }> };
	let secretRepository: Repository<E2eManualChildSecretEntity>;

	beforeAll(async () => {
		const moduleReference = await Test.createTestingModule({
			controllers: [E2eManualChildNamedController, E2eManualChildSecretController],
			imports: [TypeOrmModule.forRoot({ database: ":memory:", dropSchema: true, entities: [E2eManualChildNamedEntity, E2eManualChildSecretEntity], logging: false, synchronize: true, type: "better-sqlite3" }), TypeOrmModule.forFeature([E2eManualChildNamedEntity, E2eManualChildSecretEntity]), ApiAuthorizationModule.forRoot(), ApiSubscriberModule],
			providers: [{ provide: APP_PIPE, useValue: new ValidationPipe({ transform: true, whitelist: true }) }, E2eManualChildNamedService, E2eManualChildSecretService],
		}).compile();

		app = moduleReference.createNestApplication(new FastifyAdapter());
		await app.init();
		fastify = app.getHttpAdapter().getInstance();
		secretRepository = moduleReference.get(getRepositoryToken(E2eManualChildSecretEntity));
	});

	afterAll(async () => {
		await app?.close();
	});

	it("keeps @Exclude of the child off the wire on a generated GET", async () => {
		const row: E2eManualChildSecretEntity = await secretRepository.save({ body: { open: "o", secret: "secretValue" } });
		const response = await fastify.inject({ method: "GET", url: `/manual-child-secrets/${row.id}` });

		expect(response.statusCode).toBe(200);
		expect(response.json().body).toEqual({ open: "o" });
	});

	it("does not store an excluded child property from a generated POST", async () => {
		const response = await fastify.inject({ method: "POST", payload: { body: { open: "o", secret: "fromClient" } }, url: "/manual-child-secrets" });

		expect(response.statusCode).toBe(201);
		expect((await secretRepository.findOneByOrFail({ id: String(response.json().id) })).body).toEqual({ open: "o" });
	});

	it("accepts the exposed name of the child on a generated POST", async () => {
		const response = await fastify.inject({ method: "POST", payload: { details: { child_wire: "w" } }, url: "/manual-child-named" });

		expect(response.statusCode).toBe(201);
	});

	it("refuses the property key of the child on a generated POST", async () => {
		const response = await fastify.inject({ method: "POST", payload: { details: { childValue: "v" } }, url: "/manual-child-named" });

		expect(response.statusCode).toBe(400);
	});
});
