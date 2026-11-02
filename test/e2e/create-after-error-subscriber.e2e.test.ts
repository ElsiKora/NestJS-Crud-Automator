import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { EntityManager } from "typeorm";

import { ImATeapotException, Inject, Injectable, Module } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { InjectRepository, TypeOrmModule } from "@nestjs/typeorm";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { Column, DataSource, Entity, PrimaryColumn, Repository } from "typeorm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiController, ApiFunctionSubscriber, ApiFunctionSubscriberBase, ApiFunctionTransactionScope, ApiPropertyDescribe, ApiService, ApiServiceBase, ApiServiceObservable, ApiSubscriberModule, AuthorizationResolveDefaultPrincipal, EApiDtoType, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "../../src";

const describeText: (description: string) => PropertyDecorator = (description: string): PropertyDecorator =>
	ApiPropertyDescribe({
		description,
		exampleValue: "value",
		format: EApiPropertyStringType.STRING,
		maxLength: 64,
		minLength: 1,
		pattern: "/^.+$/",
		properties: { [EApiRouteType.CREATE]: { [EApiDtoType.BODY]: { isRequired: true } } },
		type: EApiPropertyDescribeType.STRING,
	});

@Entity("create_after_error_items")
class AfterErrorItemEntity {
	@PrimaryColumn({ length: 64, type: "varchar" })
	@describeText("id")
	public id!: string;

	@Column({ length: 64, type: "varchar", unique: true })
	@describeText("name")
	public name!: string;
}

// What the current test runs in the error hook of the create.
const knob: { afterError?: (context: { DATA: { eventManager?: EntityManager; repository: Repository<AfterErrorItemEntity> } }) => Promise<void> } = {};

@Injectable()
@ApiServiceObservable()
@ApiService({ entity: AfterErrorItemEntity })
class AfterErrorItemService extends ApiServiceBase<AfterErrorItemEntity> {
	@InjectRepository(AfterErrorItemEntity)
	public readonly repository!: Repository<AfterErrorItemEntity>;
}

@Injectable()
@ApiFunctionSubscriber({ entity: AfterErrorItemEntity })
class AfterErrorItemSubscriber extends ApiFunctionSubscriberBase<AfterErrorItemEntity> {
	public async onAfterErrorCreate(context: { DATA: { eventManager?: EntityManager; repository: Repository<AfterErrorItemEntity> } }): Promise<void> {
		await knob.afterError?.(context);
	}
}

@ApiController<AfterErrorItemEntity>({
	entity: AfterErrorItemEntity,
	name: "afterErrorItem",
	path: "after-error-items",
	routes: {
		[EApiRouteType.CREATE]: {},
		[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
		[EApiRouteType.GET]: { generation: { isEnabled: false } },
		[EApiRouteType.GET_LIST]: { generation: { isEnabled: false } },
		[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
		[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
	},
})
class AfterErrorItemController {
	@Inject(AfterErrorItemService)
	public readonly service!: AfterErrorItemService;
}

describe("Generated CREATE error subscribers on PostgreSQL (E2E)", () => {
	let app: INestApplication;
	let container: StartedPostgreSqlContainer;
	let dataSource: DataSource;
	let items: Repository<AfterErrorItemEntity>;
	let service: AfterErrorItemService;

	const post = async (name: string): Promise<number> => {
		const response = await app
			.getHttpAdapter()
			.getInstance()
			.inject({ method: "POST", payload: { id: "new", name }, url: "/after-error-items" });

		return response.statusCode;
	};

	beforeAll(async () => {
		container = await new PostgreSqlContainer("postgres:16-alpine").start();

		@Module({
			controllers: [AfterErrorItemController],
			imports: [ApiAuthorizationModule.forRoot({ principalResolver: { resolve: (user: unknown) => AuthorizationResolveDefaultPrincipal(user as never) } } as never), ApiSubscriberModule, TypeOrmModule.forRoot({ dropSchema: true, entities: [AfterErrorItemEntity], logging: false, synchronize: true, type: "postgres", url: container.getConnectionUri() }), TypeOrmModule.forFeature([AfterErrorItemEntity])],
			providers: [AfterErrorItemService, AfterErrorItemSubscriber],
		})
		class AfterErrorModule {}

		const moduleRef = await Test.createTestingModule({ imports: [AfterErrorModule] }).compile();

		app = moduleRef.createNestApplication(new FastifyAdapter());
		await app.init();
		await app.getHttpAdapter().getInstance().ready();
		dataSource = moduleRef.get(DataSource);
		items = dataSource.getRepository(AfterErrorItemEntity);
		service = moduleRef.get(AfterErrorItemService);
	}, 120_000);

	afterAll(async () => {
		await app?.close();
		await container?.stop();
	});

	beforeEach(async () => {
		await items.clear();
		await items.save({ id: "seed", name: "taken" });
		knob.afterError = undefined;
	});

	it("answers 409 when the hook reads after a unique conflict aborted the transaction", async () => {
		let seen: AfterErrorItemEntity | null = null;
		let manager: EntityManager | undefined;
		knob.afterError = async (context) => {
			manager = context.DATA.eventManager;
			seen = await context.DATA.repository.findOneBy({ id: "seed" });
		};

		expect(await post("taken")).toBe(409);
		expect(seen).toMatchObject({ name: "taken" });
		expect(manager).toBeUndefined();
	});

	it("lets the hook answer with its own error, and the create stays rolled back", async () => {
		knob.afterError = async () => {
			throw new ImATeapotException();
		};

		expect(await post("taken")).toBe(418);
		expect(await items.count()).toBe(1);
	});

	it("runs the hook inside a scope that owns the transaction, which is the scope's to settle", async () => {
		let manager: EntityManager | undefined;
		let scoped: EntityManager | undefined;
		knob.afterError = async (context) => {
			manager = context.DATA.eventManager;
		};

		await expect(
			ApiFunctionTransactionScope.runWithDataSource(dataSource, { name: "own" }, async (entityManager: EntityManager) => {
				scoped = entityManager;
				await service.create({ id: "new", name: "taken" });
			}),
		).rejects.toMatchObject({ status: 409 });
		expect(manager).toBe(scoped);
	});
});
