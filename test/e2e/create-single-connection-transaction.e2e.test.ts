import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";

import { setTimeout } from "node:timers/promises";

import { Inject, Injectable, Module } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { InjectRepository, getRepositoryToken, TypeOrmModule } from "@nestjs/typeorm";
import { Column, Entity, PrimaryGeneratedColumn, Repository } from "typeorm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiController, ApiFunctionSubscriber, ApiFunctionSubscriberBase, ApiPropertyDescribe, ApiService, ApiServiceBase, ApiServiceObservable, ApiSubscriberModule, AuthorizationResolveDefaultPrincipal, EApiFunctionTransactionMode, EApiFunctionType, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "../../src/index";

const PARALLEL_REQUESTS: number = 20;
const FAILING_EVERY: number = 4;
const FAILING_NAME_PREFIX: string = "failing";
const MAX_SUBSCRIBER_DELAY: number = 5;

const describeString: PropertyDecorator = ApiPropertyDescribe({ description: "text", exampleValue: "value", format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING });
const disabled = { generation: { isEnabled: false } };
const disabledRoutes = { [EApiRouteType.DELETE]: disabled, [EApiRouteType.GET]: disabled, [EApiRouteType.GET_LIST]: disabled, [EApiRouteType.PARTIAL_UPDATE]: disabled, [EApiRouteType.UPDATE]: disabled };

@Entity("single_connection_items")
class SingleConnectionItemEntity {
	@PrimaryGeneratedColumn("uuid")
	@describeString
	public id!: string;

	@Column({ type: "varchar" })
	@describeString
	public name!: string;
}

@Injectable()
@ApiServiceObservable()
@ApiService({ entity: SingleConnectionItemEntity })
class SingleConnectionItemService extends ApiServiceBase<SingleConnectionItemEntity> {
	@InjectRepository(SingleConnectionItemEntity)
	public readonly repository!: Repository<SingleConnectionItemEntity>;
}

@Injectable()
@ApiServiceObservable()
@ApiService({ entity: SingleConnectionItemEntity, functions: { [EApiFunctionType.CREATE]: { transaction: { mode: EApiFunctionTransactionMode.REQUIRED } } } })
class SingleConnectionJoiningItemService extends ApiServiceBase<SingleConnectionItemEntity> {
	@InjectRepository(SingleConnectionItemEntity)
	public readonly repository!: Repository<SingleConnectionItemEntity>;
}

@Injectable()
@ApiFunctionSubscriber({ entity: SingleConnectionItemEntity })
class SingleConnectionItemSubscriber extends ApiFunctionSubscriberBase<SingleConnectionItemEntity> {
	public async onAfterCreate(context: { result?: SingleConnectionItemEntity }): Promise<undefined> {
		await setTimeout(1 + Math.floor(Math.random() * MAX_SUBSCRIBER_DELAY));

		if (context.result?.name.startsWith(FAILING_NAME_PREFIX)) {
			throw new Error("Subscriber failed after an await");
		}

		return undefined;
	}
}

@ApiController<SingleConnectionItemEntity>({ entity: SingleConnectionItemEntity, name: "single-connection", path: "single-connection", routes: disabledRoutes })
class SingleConnectionItemController {
	@Inject(SingleConnectionItemService)
	public readonly service!: SingleConnectionItemService;
}

@ApiController<SingleConnectionItemEntity>({ entity: SingleConnectionItemEntity, name: "single-connection-joining", path: "single-connection-joining", routes: { [EApiRouteType.CREATE]: { transaction: { mode: EApiFunctionTransactionMode.REQUIRED } }, ...disabledRoutes } })
class SingleConnectionJoiningItemController {
	@Inject(SingleConnectionJoiningItemService)
	public readonly service!: SingleConnectionJoiningItemService;
}

@Module({
	controllers: [SingleConnectionItemController, SingleConnectionJoiningItemController],
	imports: [TypeOrmModule.forRoot({ database: ":memory:", dropSchema: true, entities: [SingleConnectionItemEntity], logging: false, synchronize: true, type: "better-sqlite3" }), TypeOrmModule.forFeature([SingleConnectionItemEntity]), ApiAuthorizationModule.forRoot({ principalResolver: { resolve: (user: unknown) => AuthorizationResolveDefaultPrincipal(user) } }), ApiSubscriberModule],
	providers: [SingleConnectionItemService, SingleConnectionItemSubscriber, SingleConnectionJoiningItemService],
})
class SingleConnectionAppModule {}

describe("Generated CREATE on a driver with one connection (E2E)", () => {
	let app: INestApplication;
	let fastify: { inject: (options: { method: string; payload?: unknown; url: string }) => Promise<{ json: () => { name: string }; statusCode: number }> };
	let repository: Repository<SingleConnectionItemEntity>;

	beforeAll(async () => {
		const moduleRef = await Test.createTestingModule({ imports: [SingleConnectionAppModule] }).compile();

		app = moduleRef.createNestApplication(new FastifyAdapter());
		await app.init();
		fastify = app.getHttpAdapter().getInstance() as typeof fastify;
		repository = app.get(getRepositoryToken(SingleConnectionItemEntity));
	});

	beforeEach(async () => {
		await repository.clear();
	});

	afterAll(async () => {
		await app.close();
	});

	async function postParallel(path: string): Promise<Array<{ json: () => { name: string }; statusCode: number }>> {
		return await Promise.all(Array.from({ length: PARALLEL_REQUESTS }, async (_value: unknown, index: number) => await fastify.inject({ method: "POST", payload: { name: index % FAILING_EVERY === FAILING_EVERY - 1 ? `${FAILING_NAME_PREFIX}-${String(index)}` : `stored-${String(index)}` }, url: `/${path}` })));
	}

	it.each([["single-connection"], ["single-connection-joining"]])("keeps the row of every 201 on %s when other requests roll back after an await", async (path: string) => {
		const responses = await postParallel(path);
		const created: Array<string> = responses.filter((response) => response.statusCode === 201).map((response) => response.json().name);
		const rows: Array<SingleConnectionItemEntity> = await repository.find();

		expect(responses.filter((response) => response.statusCode === 500)).toHaveLength(5);
		expect(created).toHaveLength(15);
		expect(rows.map((row: SingleConnectionItemEntity): string => row.name).sort()).toEqual(created.sort());
	});
});
