import "reflect-metadata";

import type { ExecutionContext, INestApplication, Type } from "@nestjs/common";
import type { IAuthGuard } from "@nestjs/passport";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { Logger, Repository } from "typeorm";

import { Inject, Injectable, Module } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { InjectRepository, getRepositoryToken, TypeOrmModule } from "@nestjs/typeorm";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { Column, Entity, PrimaryColumn } from "typeorm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
	ApiAuthorizationModule,
	ApiAuthorizationPolicy,
	ApiAuthorizationPolicyBase,
	ApiController,
	ApiControllerSecurable,
	ApiFunctionSubscriber,
	ApiFunctionSubscriberBase,
	ApiPropertyDescribe,
	ApiService,
	ApiServiceBase,
	ApiServiceObservable,
	ApiSubscriberModule,
	AuthorizationResolveDefaultPrincipal,
	CamelCaseString,
	EApiAuthenticationType,
	EApiAuthorizationMode,
	EApiFunctionTransactionMode,
	EApiFunctionType,
	EApiPropertyDescribeType,
	EApiPropertyStringType,
	EApiRouteType,
} from "../../src/index";

const IN_SCOPE: string = "scope-in";
const OUT_OF_SCOPE: string = "scope-out";

class UpdateQueryLogger implements Logger {
	public readonly queries: Array<string> = [];

	public log(): void {}

	public logMigration(): void {}

	public logQuery(query: string): void {
		this.queries.push(query);
	}

	public logQueryError(): void {}

	public logQuerySlow(): void {}

	public logSchemaBuild(): void {}
}

const queryLogger: UpdateQueryLogger = new UpdateQueryLogger();

function describeString(description: string): PropertyDecorator {
	return ApiPropertyDescribe({ description, exampleValue: "value", format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING });
}

@Entity("update_scope_pg_items")
class ScopedItemEntity {
	@PrimaryColumn({ type: "varchar" })
	@describeString("id")
	public id!: string;

	@Column({ type: "varchar" })
	@describeString("name")
	public name!: string;

	@Column({ type: "varchar" })
	@describeString("tenantId")
	public tenantId!: string;
}

@Injectable()
@ApiServiceObservable()
@ApiService({ entity: ScopedItemEntity })
class ScopedItemService extends ApiServiceBase<ScopedItemEntity> {
	@InjectRepository(ScopedItemEntity)
	public readonly repository!: Repository<ScopedItemEntity>;
}

@Injectable()
@ApiServiceObservable()
@ApiService({ entity: ScopedItemEntity, functions: { [EApiFunctionType.UPDATE]: { transaction: { mode: EApiFunctionTransactionMode.REQUIRED } } } })
class ScopedRequiredUpdateService extends ApiServiceBase<ScopedItemEntity> {
	@InjectRepository(ScopedItemEntity)
	public readonly repository!: Repository<ScopedItemEntity>;
}

@Injectable()
class ScopedAuthGuard implements IAuthGuard {
	public canActivate(context: ExecutionContext): boolean {
		context.switchToHttp().getRequest<{ user?: unknown }>().user = { id: "user-1" };

		return true;
	}

	public getAuthenticateOptions(): undefined {
		return undefined;
	}

	public getRequest<TRequest = any>(context: ExecutionContext): TRequest {
		return context.switchToHttp().getRequest();
	}

	public handleRequest<TUser = any>(_error: unknown, user: TUser): TUser {
		return user;
	}

	public async logIn(): Promise<void> {
		return Promise.resolve();
	}
}

@Injectable()
@ApiAuthorizationPolicy({ entity: ScopedItemEntity })
class ScopedItemPolicy extends ApiAuthorizationPolicyBase<ScopedItemEntity> {
	public static where: object | undefined = { tenantId: IN_SCOPE };

	public onBeforePartialUpdate() {
		return this.resolveRule();
	}

	public onBeforeUpdate() {
		return this.resolveRule();
	}

	private resolveRule() {
		const where: object | undefined = ScopedItemPolicy.where;

		return this.allow(where ? { scope: () => ({ where: where as never }) } : {});
	}
}

@Injectable()
@ApiFunctionSubscriber({ entity: ScopedItemEntity })
class ScopedItemSubscriber extends ApiFunctionSubscriberBase<ScopedItemEntity> {
	public static afterUpdate: ((context: { DATA: { repository: Repository<ScopedItemEntity> }; result: ScopedItemEntity }) => Promise<void>) | undefined;

	public async onAfterUpdate(context: any): Promise<undefined> {
		await ScopedItemSubscriber.afterUpdate?.(context);

		return undefined;
	}
}

interface IScopedRoute {
	label: string;
	path: string;
	service: Type<ScopedItemService | ScopedRequiredUpdateService>;
	transactionMode: EApiFunctionTransactionMode;
}

const scopedRoutes: Array<IScopedRoute> = [
	{ label: "route SUPPORTS", path: "update-scope-pg-supports", service: ScopedItemService, transactionMode: EApiFunctionTransactionMode.SUPPORTS },
	{ label: "route REQUIRED", path: "update-scope-pg-required", service: ScopedItemService, transactionMode: EApiFunctionTransactionMode.REQUIRED },
	{ label: "route SUPPORTS with a REQUIRED update function", path: "update-scope-pg-function-required", service: ScopedRequiredUpdateService, transactionMode: EApiFunctionTransactionMode.SUPPORTS },
];

function createItemController({ path, service, transactionMode }: IScopedRoute): Type<unknown> {
	class ScopedItemController {
		@Inject(service)
		public readonly service!: ScopedItemService | ScopedRequiredUpdateService;
	}

	// Every controller of one application needs its own class name, because the name starts its generated DTO names.
	Object.defineProperty(ScopedItemController, "name", { value: `${CamelCaseString(path)}Controller` });

	const updateRoute = { security: { authentication: { guard: ScopedAuthGuard, type: EApiAuthenticationType.USER } }, transaction: { mode: transactionMode } };

	const controller = ApiController<ScopedItemEntity>({
		authorization: {
			defaultMode: EApiAuthorizationMode.HOOKS,
			policyNamespace: "update-scope-pg:item",
			resourceDefinition: { entity: ScopedItemEntity, fields: [{ isFilterable: true, path: "resource.tenantId", queryPath: "tenantId" }], namespace: "update-scope-pg:item", resourcePath: "update-scope-pg:item/{id}", resourceType: "update-scope-pg:item" },
		},
		entity: ScopedItemEntity,
		name: path,
		path,
		routes: {
			[EApiRouteType.CREATE]: { generation: { isEnabled: false } },
			[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
			[EApiRouteType.GET]: { generation: { isEnabled: false } },
			[EApiRouteType.GET_LIST]: { generation: { isEnabled: false } },
			[EApiRouteType.PARTIAL_UPDATE]: updateRoute,
			[EApiRouteType.UPDATE]: updateRoute,
		},
	} as never)(ScopedItemController);
	ApiControllerSecurable()(controller);

	return controller as Type<unknown>;
}

describe("Generated UPDATE authorization scope on PostgreSQL (E2E)", () => {
	let app: INestApplication;
	let container: StartedPostgreSqlContainer;
	let fastify: { inject: (options: { method: string; payload?: unknown; url: string }) => Promise<{ statusCode: number }> };
	let items: Repository<ScopedItemEntity>;

	async function updateItem(path: string, method: "PATCH" | "PUT", id: string, tenantId: string): Promise<number> {
		return (await fastify.inject({ method, payload: { name: "Changed", tenantId }, url: `/${path}/${id}` })).statusCode;
	}

	beforeAll(async () => {
		container = await new PostgreSqlContainer("postgres:17-alpine").start();

		@Module({
			controllers: scopedRoutes.map((route: IScopedRoute) => createItemController(route)),
			imports: [
				TypeOrmModule.forRoot({
					database: container.getDatabase(),
					dropSchema: true,
					entities: [ScopedItemEntity],
					host: container.getHost(),
					logger: queryLogger,
					logging: ["query"],
					password: container.getPassword(),
					port: container.getPort(),
					synchronize: true,
					type: "postgres",
					username: container.getUsername(),
				}),
				TypeOrmModule.forFeature([ScopedItemEntity]),
				ApiAuthorizationModule.forRoot({ principalResolver: { resolve: (user: unknown) => AuthorizationResolveDefaultPrincipal(user) } }),
				ApiSubscriberModule,
			],
			providers: [ScopedAuthGuard, ScopedItemPolicy, ScopedItemService, ScopedItemSubscriber, ScopedRequiredUpdateService],
		})
		class ScopedModule {}

		const moduleRef = await Test.createTestingModule({ imports: [ScopedModule] }).compile();

		app = moduleRef.createNestApplication(new FastifyAdapter());
		await app.init();
		fastify = app.getHttpAdapter().getInstance() as typeof fastify;
		items = app.get(getRepositoryToken(ScopedItemEntity));
	}, 120_000);

	beforeEach(async () => {
		await items.clear();
		await items.save({ id: "item", name: "Original", tenantId: IN_SCOPE });
		ScopedItemPolicy.where = { tenantId: IN_SCOPE };
		ScopedItemSubscriber.afterUpdate = undefined;
	});

	afterAll(async () => {
		await app?.close();
		await container?.stop();
	}, 60_000);

	describe.each(scopedRoutes)("$label", ({ path }: IScopedRoute) => {
		it.each(["PATCH", "PUT"] as const)("commits a %s that keeps the row inside the scope", async (method: "PATCH" | "PUT") => {
			expect(await updateItem(path, method, "item", IN_SCOPE)).toBe(200);
			expect(await items.findOneBy({ id: "item" })).toEqual({ id: "item", name: "Changed", tenantId: IN_SCOPE });
		});

		it.each(["PATCH", "PUT"] as const)("refuses a %s that moves the row out of the scope and rolls it back", async (method: "PATCH" | "PUT") => {
			expect(await updateItem(path, method, "item", OUT_OF_SCOPE)).toBe(403);
			expect(await items.findOneBy({ id: "item" })).toEqual({ id: "item", name: "Original", tenantId: IN_SCOPE });
		});
	});

	describe("function subscribers", () => {
		it("runs onAfterUpdate before the refusal and rolls back what it wrote through the transaction", async () => {
			const externalEffects: Array<string> = [];

			ScopedItemSubscriber.afterUpdate = async ({ DATA, result }) => {
				externalEffects.push(result.tenantId);
				await DATA.repository.save({ id: "side-write", name: "Item", tenantId: IN_SCOPE });
			};

			expect(await updateItem("update-scope-pg-supports", "PATCH", "item", OUT_OF_SCOPE)).toBe(403);
			expect(externalEffects).toEqual([OUT_OF_SCOPE]);
			expect(await items.findOneBy({ id: "item" })).toEqual({ id: "item", name: "Original", tenantId: IN_SCOPE });
			expect(await items.countBy({ id: "side-write" })).toBe(0);
		});
	});

	describe("transactions", () => {
		it("opens no transaction for a non-scoped update under SUPPORTS", async () => {
			ScopedItemPolicy.where = undefined;
			queryLogger.queries.length = 0;

			expect(await updateItem("update-scope-pg-supports", "PATCH", "item", OUT_OF_SCOPE)).toBe(200);
			// Only the save's own transaction around the UPDATE: the route reads the old row and reloads it outside any transaction.
			expect(queryLogger.queries.map((query: string): string => query.split(" ")[0] ?? "")).toEqual(["SELECT", "SELECT", "START", "UPDATE", "COMMIT", "SELECT"]);
			expect(await items.findOneBy({ id: "item" })).toEqual({ id: "item", name: "Changed", tenantId: OUT_OF_SCOPE });
		});

		it("runs a scoped update under SUPPORTS as the same queries inside one transaction", async () => {
			queryLogger.queries.length = 0;

			expect(await updateItem("update-scope-pg-supports", "PATCH", "item", IN_SCOPE)).toBe(200);
			// The same reads, write and reload as a non-scoped update, inside one route transaction that the save joins.
			expect(queryLogger.queries.map((query: string): string => query.split(" ")[0] ?? "")).toEqual(["START", "SELECT", "SELECT", "UPDATE", "SELECT", "COMMIT"]);
		});
	});
});
