import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type { DataSourceOptions, Repository } from "typeorm";

import { Injectable, Logger, Scope } from "@nestjs/common";
import { APP_PIPE } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { InjectRepository, TypeOrmModule } from "@nestjs/typeorm";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { afterAll, describe, expect, it, vi } from "vitest";

import { ApiAuthorizationModule, ApiController, ApiPropertyDescribe, ApiService, ApiServiceBase, ApiSubscriberModule, EApiControllerGetListQueryPaginationMode, EApiControllerGetListQueryUnlistedFields, EApiControllerRequestTarget, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType, EFilterOrderDirection } from "../../src/index";
import { E2eValidationPipe } from "./app/validation-pipe";
import { E2E_EAGER_CURSOR_CONTROLLERS } from "./to-many-relation-eager";
import { E2eEagerAuthGuard } from "./to-many-relation-eager/auth-guard";
import { E2eEagerAuthorEntity, E2eEagerCommentEntity, E2eEagerPostEntity, E2eEagerTagEntity } from "./to-many-relation-eager/entity";
import { E2eEagerPostPolicySubscriber } from "./to-many-relation-eager/policy";
import { E2eEagerAuthorService, E2eEagerCommentService, E2eEagerPostService, E2eEagerTagService } from "./to-many-relation-eager/service";

const ENTITIES: Array<Function> = [E2eEagerAuthorEntity, E2eEagerCommentEntity, E2eEagerPostEntity, E2eEagerTagEntity];

const CURSOR_ROUTE = { request: { [EApiControllerRequestTarget.QUERY]: { order: { fields: {}, tieBreakers: [{ direction: EFilterOrderDirection.ASC, field: "id" }], unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT }, pagination: { mode: EApiControllerGetListQueryPaginationMode.CURSOR } } } } as never;

@Entity("cursor_driver_items")
class CursorDriverItemEntity {
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@ApiPropertyDescribe({ description: "name", exampleValue: "name", format: EApiPropertyStringType.STRING, maxLength: 50, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING })
	@Column({ type: "varchar" })
	public name!: string;
}

@Injectable()
@ApiService<CursorDriverItemEntity>({ entity: CursorDriverItemEntity })
class CursorDriverItemService extends ApiServiceBase<CursorDriverItemEntity> {
	public constructor(
		@InjectRepository(CursorDriverItemEntity)
		public repository: Repository<CursorDriverItemEntity>,
	) {
		super();
	}
}

@Injectable({ scope: Scope.REQUEST })
@ApiService<CursorDriverItemEntity>({ entity: CursorDriverItemEntity })
class RequestScopedItemService extends ApiServiceBase<CursorDriverItemEntity> {
	public constructor(
		@InjectRepository(CursorDriverItemEntity)
		public repository: Repository<CursorDriverItemEntity>,
	) {
		super();
	}
}

@ApiController<CursorDriverItemEntity>({ entity: CursorDriverItemEntity, path: "request-scoped-items", routes: { [EApiRouteType.GET_LIST]: CURSOR_ROUTE } })
class RequestScopedItemController {
	public constructor(public service: RequestScopedItemService) {}
}

class DiscardedItemController {
	public constructor(public service: CursorDriverItemService) {}
}

Reflect.defineMetadata("design:paramtypes", [CursorDriverItemService], DiscardedItemController);

// The return value is discarded on purpose: the class that was decorated is what gets registered.
ApiController<CursorDriverItemEntity>({ entity: CursorDriverItemEntity, path: "discarded-items", routes: { [EApiRouteType.GET_LIST]: CURSOR_ROUTE } })(DiscardedItemController);

describe("CURSOR GET_LIST on a driver other than PostgreSQL (E2E)", () => {
	let app: INestApplication | undefined;

	afterAll(async () => {
		await app?.close();
	});

	const createApplication = async (controller: Function, service: Function): Promise<INestApplication> => {
		const moduleReference = await Test.createTestingModule({
			controllers: [controller as never],
			imports: [TypeOrmModule.forRoot({ database: ":memory:", entities: [CursorDriverItemEntity], logging: false, synchronize: true, type: "better-sqlite3" } as DataSourceOptions), TypeOrmModule.forFeature([CursorDriverItemEntity]), ApiAuthorizationModule.forRoot()],
			providers: [service as never],
		}).compile();

		await app?.close();
		app = moduleReference.createNestApplication(new FastifyAdapter());

		return app;
	};

	it("fails application bootstrap when the return value of the decorator is discarded and the decorated class is registered", async () => {
		const application: INestApplication = await createApplication(DiscardedItemController, CursorDriverItemService);
		const error: unknown = await application.init().then(
			(): undefined => undefined,
			(reason: unknown): unknown => reason,
		);

		expect(error).toBeInstanceOf(Error);
		expect((error as Error).message).toContain('Controller "DiscardedItemController" route "getList": CURSOR GET_LIST supports only PostgreSQL; the active driver is "better-sqlite3"');
	});

	it("names the route, the driver and the guide on the request when the controller is request-scoped, which Nest skips at bootstrap", async () => {
		const loggerError = vi.spyOn(Logger.prototype, "error").mockImplementation((): void => undefined);
		const application: INestApplication = await createApplication(RequestScopedItemController, RequestScopedItemService);

		await application.init();

		const response = await (application.getHttpAdapter().getInstance() as { inject: (request: { method: string; url: string }) => Promise<{ json: () => unknown; statusCode: number }> }).inject({ method: "GET", url: "/request-scoped-items?limit=10" });
		const logged: string = loggerError.mock.calls.map((call: Array<unknown>): string => String(call[0])).join("\n");

		loggerError.mockRestore();

		expect(response.statusCode).toBe(500);
		expect(logged).toContain('Controller "RequestScopedItemController" route "getList": CURSOR GET_LIST supports only PostgreSQL; the active driver is "better-sqlite3". In tests, CURSOR needs a PostgreSQL DataSource: https://elsikora.com/docs/nestjs-crud-automator/guides/testing#cursor-controllers');
	});

	it("fails application bootstrap naming the route and the driver", async () => {
		const moduleReference = await Test.createTestingModule({
			controllers: E2E_EAGER_CURSOR_CONTROLLERS.slice(0, 1),
			imports: [TypeOrmModule.forRoot({ database: ":memory:", entities: ENTITIES, logging: false, synchronize: true, type: "better-sqlite3" } as DataSourceOptions), TypeOrmModule.forFeature(ENTITIES), ApiAuthorizationModule.forRoot(), ApiSubscriberModule],
			providers: [{ provide: APP_PIPE, useClass: E2eValidationPipe }, E2eEagerAuthGuard, E2eEagerAuthorService, E2eEagerCommentService, E2eEagerPostPolicySubscriber, E2eEagerPostService, E2eEagerTagService],
		}).compile();

		app = moduleReference.createNestApplication(new FastifyAdapter());

		const error: unknown = await app.init().then(
			(): undefined => undefined,
			(reason: unknown): unknown => reason,
		);

		expect(error).toBeInstanceOf(Error);
		expect((error as Error).message).toContain('Controller "E2eEagerNoneCursorController" route "getList": CURSOR GET_LIST supports only PostgreSQL; the active driver is "better-sqlite3". In tests, CURSOR needs a PostgreSQL DataSource: https://elsikora.com/docs/nestjs-crud-automator/guides/testing#cursor-controllers');
	});
});
