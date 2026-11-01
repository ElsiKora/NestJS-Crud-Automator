import "reflect-metadata";

import type { ExecutionContext, INestApplication, Type } from "@nestjs/common";
import type { IAuthGuard } from "@nestjs/passport";
import type { IApiAuthorizationRuleContext, IApiPolicyAttachmentSource, IApiPolicyDocumentRecord, IApiPolicyDocumentSource, IApiPolicyStatement, IApiSubscriberFunctionTransactionContext } from "../../src/index";
import type { Repository } from "typeorm";

import { Inject, Injectable, Module, NotFoundException } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { InjectRepository, getRepositoryToken, TypeOrmModule } from "@nestjs/typeorm";
import { Column, Entity, In, PrimaryColumn } from "typeorm";
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
	EApiAuthenticationType,
	EApiAuthorizationMode,
	EApiAuthorizationPrincipalType,
	EApiFunctionTransactionMode,
	EApiFunctionType,
	EApiPolicyEffect,
	EApiPolicySourceType,
	EApiPropertyDescribeType,
	EApiPropertyStringType,
	EApiRouteType,
} from "../../src/index";

const IN_SCOPE_TENANT_ID: string = "tenant-1";
const OUT_OF_SCOPE_TENANT_ID: string = "tenant-2";
const POLICY_ID: string = "create-scope-policy";
const POLICY_NAMESPACE: string = "create-scope:item";

function describeStringProperty(description: string, exampleValue: string): PropertyDecorator {
	return ApiPropertyDescribe({
		description,
		exampleValue,
		format: EApiPropertyStringType.STRING,
		maxLength: 64,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	});
}

@Entity("create_scope_items")
class CreateScopeItemEntity {
	@Column({ nullable: true, type: "varchar", unique: true })
	@describeStringProperty("code", "code-1")
	public code!: null | string;

	@PrimaryColumn({ type: "varchar" })
	@describeStringProperty("id", "item-1")
	public id!: string;

	@Column({ type: "varchar" })
	@describeStringProperty("name", "Item")
	public name!: string;

	@Column({ type: "varchar" })
	@describeStringProperty("tenantId", IN_SCOPE_TENANT_ID)
	public tenantId!: string;
}

@Injectable()
@ApiServiceObservable()
@ApiService({ entity: CreateScopeItemEntity })
class CreateScopeItemService extends ApiServiceBase<CreateScopeItemEntity> {
	@InjectRepository(CreateScopeItemEntity)
	public readonly repository!: Repository<CreateScopeItemEntity>;
}

@Injectable()
@ApiServiceObservable()
@ApiService({
	entity: CreateScopeItemEntity,
	functions: {
		[EApiFunctionType.CREATE]: { transaction: { mode: EApiFunctionTransactionMode.REQUIRED } },
	},
})
class CreateScopeRequiredFunctionItemService extends ApiServiceBase<CreateScopeItemEntity> {
	@InjectRepository(CreateScopeItemEntity)
	public readonly repository!: Repository<CreateScopeItemEntity>;
}

@Injectable()
@ApiService({
	entity: CreateScopeItemEntity,
	functions: {
		[EApiFunctionType.CREATE]: { transaction: { mode: EApiFunctionTransactionMode.NONE } },
	},
})
class CreateScopeNoneFunctionItemService extends ApiServiceBase<CreateScopeItemEntity> {
	@InjectRepository(CreateScopeItemEntity)
	public readonly repository!: Repository<CreateScopeItemEntity>;
}

type TCreateScopeItemService = CreateScopeItemService | CreateScopeNoneFunctionItemService | CreateScopeRequiredFunctionItemService;

@Injectable()
class CreateScopeAuthGuard implements IAuthGuard {
	public canActivate(context: ExecutionContext): boolean {
		this.getRequest<{ user?: unknown }>(context).user = { id: "user-1", tenantId: IN_SCOPE_TENANT_ID };

		return true;
	}

	public getRequest<TRequest = any>(context: ExecutionContext): TRequest {
		return context.switchToHttp().getRequest();
	}

	public async logIn<TRequest extends { logIn: Function } = any>(_request: TRequest): Promise<void> {
		return Promise.resolve();
	}

	public handleRequest<TUser = any>(_err: any, user: any, _info: any, _context: ExecutionContext, _status?: any): TUser {
		return user;
	}

	public getAuthenticateOptions(_context: ExecutionContext): undefined {
		return undefined;
	}
}

@Injectable()
@ApiAuthorizationPolicy({ entity: CreateScopeItemEntity })
class CreateScopePolicy extends ApiAuthorizationPolicyBase<CreateScopeItemEntity> {
	public static whereOverride: unknown;

	public onBeforeCreate() {
		return this.allow({
			scope: (context: IApiAuthorizationRuleContext<CreateScopeItemEntity>) => ({
				where: (CreateScopePolicy.whereOverride ?? { tenantId: (context.principal.attributes as { tenantId: string }).tenantId }) as never,
			}),
		});
	}
}

@Injectable()
@ApiFunctionSubscriber({ entity: CreateScopeItemEntity })
class CreateScopeFunctionSubscriber extends ApiFunctionSubscriberBase<CreateScopeItemEntity> {
	public static lifecycle: Array<string> = [];

	public static reloadError: Error | undefined;

	public async onAfterCommit(context: IApiSubscriberFunctionTransactionContext): Promise<void> {
		CreateScopeFunctionSubscriber.lifecycle.push(`commit:${context.DATA.transaction.owner.kind}`);
	}

	public async onAfterRollback(context: IApiSubscriberFunctionTransactionContext): Promise<void> {
		CreateScopeFunctionSubscriber.lifecycle.push(`rollback:${context.DATA.transaction.owner.kind}`);
	}

	public async onBeforeGet(): Promise<undefined> {
		if (CreateScopeFunctionSubscriber.reloadError) {
			throw CreateScopeFunctionSubscriber.reloadError;
		}

		return undefined;
	}
}

const createScopeAuthorization = {
	policyNamespace: POLICY_NAMESPACE,
	resourceDefinition: {
		entity: CreateScopeItemEntity,
		fields: [
			{ isFilterable: true, path: "resource.id", queryPath: "id" },
			{ isFilterable: true, path: "resource.tenantId", queryPath: "tenantId" },
		],
		namespace: POLICY_NAMESPACE,
		resourcePath: "create-scope:item/{id}",
		resourceType: "create-scope:item",
	},
};

const allowCreate: IApiPolicyStatement = {
	Action: [`${POLICY_NAMESPACE}:create`],
	Effect: EApiPolicyEffect.ALLOW,
	Resource: ["create-scope:item/*"],
};

const allowCreateInTenant: IApiPolicyStatement = {
	...allowCreate,
	Condition: { StringEquals: { "resource.tenantId": "${principal.attributes.tenantId}" } },
};

function createScopeController(path: string, mode: EApiAuthorizationMode, transactionMode: EApiFunctionTransactionMode, service: Type<TCreateScopeItemService>): Type<unknown> {
	@ApiControllerSecurable()
	@ApiController<CreateScopeItemEntity>({
		authorization: { ...createScopeAuthorization, defaultMode: mode },
		entity: CreateScopeItemEntity,
		name: path,
		path,
		routes: {
			[EApiRouteType.CREATE]: {
				security: { authentication: { guard: CreateScopeAuthGuard, type: EApiAuthenticationType.USER } },
				transaction: { mode: transactionMode },
			},
			[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
			[EApiRouteType.GET]: { generation: { isEnabled: false } },
			[EApiRouteType.GET_LIST]: { generation: { isEnabled: false } },
			[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
			[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
		},
	})
	class CreateScopeController {
		@Inject(service)
		public readonly service!: TCreateScopeItemService;
	}

	return CreateScopeController;
}

const HOOKS_SUPPORTS_PATH: string = "create-scope-hooks-supports";
const IAM_SUPPORTS_PATH: string = "create-scope-iam-supports";
const REQUIRED_FUNCTION_PATH: string = "create-scope-required-function";
const NONE_FUNCTION_PATH: string = "create-scope-none-function";
const NONE_ROUTE_PATH: string = "create-scope-none-route";

const scopedRoutes: Array<{ mode: EApiAuthorizationMode; path: string; transactionMode: EApiFunctionTransactionMode }> = [
	{ mode: EApiAuthorizationMode.HOOKS, path: HOOKS_SUPPORTS_PATH, transactionMode: EApiFunctionTransactionMode.SUPPORTS },
	{ mode: EApiAuthorizationMode.HOOKS, path: "create-scope-hooks-required", transactionMode: EApiFunctionTransactionMode.REQUIRED },
	{ mode: EApiAuthorizationMode.IAM, path: IAM_SUPPORTS_PATH, transactionMode: EApiFunctionTransactionMode.SUPPORTS },
	{ mode: EApiAuthorizationMode.IAM, path: "create-scope-iam-required", transactionMode: EApiFunctionTransactionMode.REQUIRED },
];

describe("Generated CREATE authorization scope (E2E)", () => {
	let app: INestApplication;
	let fastify: {
		inject: (options: { method: string; payload?: unknown; url: string }) => Promise<{ body: string; json: () => unknown; statusCode: number }>;
	};
	let repository: Repository<CreateScopeItemEntity>;
	let statements: Array<IApiPolicyStatement> = [];

	const attachmentSource: IApiPolicyAttachmentSource = {
		async getAttachments() {
			return {
				attachments: [{ policyId: POLICY_ID, principalId: "user-1", principalType: EApiAuthorizationPrincipalType.USER }],
				boundaries: [],
			};
		},
	};

	const documentSource: IApiPolicyDocumentSource = {
		async getDocumentsByIds(ids: ReadonlyArray<string>): Promise<ReadonlyArray<IApiPolicyDocumentRecord>> {
			return ids.includes(POLICY_ID) ? [{ document: { Statement: statements, Version: "2026-03-14" }, id: POLICY_ID, namespace: POLICY_NAMESPACE, sourceType: EApiPolicySourceType.MANAGED, version: "1" }] : [];
		},
	};

	async function postItem(path: string, id: string, tenantId: string, code?: string) {
		return await fastify.inject({
			method: "POST",
			payload: { code, id, name: "Item", tenantId },
			url: `/${path}`,
		});
	}

	async function createItem(path: string, id: string, tenantId: string): Promise<number> {
		return (await postItem(path, id, tenantId)).statusCode;
	}

	beforeAll(async () => {
		@Module({
			controllers: [
				...scopedRoutes.map(({ mode, path, transactionMode }) => createScopeController(path, mode, transactionMode, CreateScopeItemService)),
				createScopeController(REQUIRED_FUNCTION_PATH, EApiAuthorizationMode.HOOKS, EApiFunctionTransactionMode.SUPPORTS, CreateScopeRequiredFunctionItemService),
				createScopeController(NONE_FUNCTION_PATH, EApiAuthorizationMode.HOOKS, EApiFunctionTransactionMode.SUPPORTS, CreateScopeNoneFunctionItemService),
				createScopeController(NONE_ROUTE_PATH, EApiAuthorizationMode.HOOKS, EApiFunctionTransactionMode.NONE, CreateScopeItemService),
			],
			imports: [
				TypeOrmModule.forRoot({
					database: ":memory:",
					dropSchema: true,
					entities: [CreateScopeItemEntity],
					logging: false,
					synchronize: true,
					type: "better-sqlite3",
				}),
				TypeOrmModule.forFeature([CreateScopeItemEntity]),
				ApiAuthorizationModule.forRoot({
					iam: {
						attachmentSources: [attachmentSource],
						documentSources: [documentSource],
					},
					principalResolver: { resolve: (user: unknown) => AuthorizationResolveDefaultPrincipal(user) },
				}),
				ApiSubscriberModule,
			],
			providers: [CreateScopeAuthGuard, CreateScopeFunctionSubscriber, CreateScopeItemService, CreateScopeNoneFunctionItemService, CreateScopePolicy, CreateScopeRequiredFunctionItemService],
		})
		class CreateScopeAppModule {}

		const moduleRef = await Test.createTestingModule({ imports: [CreateScopeAppModule] }).compile();

		app = moduleRef.createNestApplication(new FastifyAdapter());
		await app.init();

		fastify = app.getHttpAdapter().getInstance();
		repository = app.get(getRepositoryToken(CreateScopeItemEntity));
	});

	beforeEach(async () => {
		await repository.clear();
		statements = [allowCreateInTenant];
		CreateScopeFunctionSubscriber.lifecycle = [];
		CreateScopeFunctionSubscriber.reloadError = undefined;
		CreateScopePolicy.whereOverride = undefined;
	});

	afterAll(async () => {
		await app.close();
	});

	describe.each(scopedRoutes)("$mode scope under route transaction mode $transactionMode", ({ path }: { path: string }) => {
		it("creates a row inside the scope", async () => {
			expect(await createItem(path, "item-in-scope", IN_SCOPE_TENANT_ID)).toBe(201);
			expect(await repository.findOneBy({ id: "item-in-scope" })).toMatchObject({ tenantId: IN_SCOPE_TENANT_ID });
			expect(CreateScopeFunctionSubscriber.lifecycle).toEqual(["commit:ROUTE"]);
		});

		it("refuses a row outside the scope with 403 and persists nothing", async () => {
			const response = await postItem(path, "item-out-of-scope", OUT_OF_SCOPE_TENANT_ID);

			expect(response.statusCode).toBe(403);
			expect(response.json()).toEqual({ message: "Forbidden", statusCode: 403 });
			expect(await repository.findOneBy({ id: "item-out-of-scope" })).toBeNull();
			expect(CreateScopeFunctionSubscriber.lifecycle).toEqual(["rollback:ROUTE"]);
		});
	});

	describe("transaction contracts", () => {
		it("keeps a function-owned REQUIRED CREATE uncommitted until the scoped reload confirms the row", async () => {
			expect(await createItem(REQUIRED_FUNCTION_PATH, "item-out-of-scope", OUT_OF_SCOPE_TENANT_ID)).toBe(403);
			expect(await repository.findOneBy({ id: "item-out-of-scope" })).toBeNull();
			expect(CreateScopeFunctionSubscriber.lifecycle).toEqual(["rollback:ROUTE"]);
		});

		it("fails closed on a NONE route before writing a scoped row", async () => {
			expect(await createItem(NONE_ROUTE_PATH, "item-none-route", IN_SCOPE_TENANT_ID)).toBe(500);
			expect(await repository.findOneBy({ id: "item-none-route" })).toBeNull();
		});

		it("fails closed on a NONE CREATE function before writing a scoped row", async () => {
			expect(await createItem(NONE_FUNCTION_PATH, "item-none-function", IN_SCOPE_TENANT_ID)).toBe(500);
			expect(await repository.findOneBy({ id: "item-none-function" })).toBeNull();
		});
	});

	describe("scope forms", () => {
		it("treats an IAM Allow without conditions as non-scoped and opens no transaction", async () => {
			statements = [allowCreate];

			expect(await createItem(IAM_SUPPORTS_PATH, "item-unscoped", OUT_OF_SCOPE_TENANT_ID)).toBe(201);
			expect(await repository.findOneBy({ id: "item-unscoped" })).toMatchObject({ tenantId: OUT_OF_SCOPE_TENANT_ID });
			expect(CreateScopeFunctionSubscriber.lifecycle).toEqual([]);
		});

		it("treats an empty WHERE object as non-scoped and opens no transaction", async () => {
			CreateScopePolicy.whereOverride = {};

			expect(await createItem(NONE_ROUTE_PATH, "item-empty-where", OUT_OF_SCOPE_TENANT_ID)).toBe(201);
			expect(await repository.findOneBy({ id: "item-empty-where" })).toMatchObject({ tenantId: OUT_OF_SCOPE_TENANT_ID });
			expect(CreateScopeFunctionSubscriber.lifecycle).toEqual([]);
		});

		it("refuses every row under a match-nothing scope", async () => {
			CreateScopePolicy.whereOverride = { id: In([]) };

			expect(await createItem(HOOKS_SUPPORTS_PATH, "item-match-nothing", IN_SCOPE_TENANT_ID)).toBe(403);
			expect(await repository.findOneBy({ id: "item-match-nothing" })).toBeNull();
		});

		it("rejects an empty WHERE array before writing", async () => {
			CreateScopePolicy.whereOverride = [];

			expect(await createItem(HOOKS_SUPPORTS_PATH, "item-empty-array", IN_SCOPE_TENANT_ID)).toBe(500);
			expect(await repository.findOneBy({ id: "item-empty-array" })).toBeNull();
		});
	});

	describe("errors that are not a scope verdict", () => {
		it("keeps a 404 raised by a reload subscriber and still rolls back", async () => {
			CreateScopeFunctionSubscriber.reloadError = new NotFoundException();

			expect(await createItem(HOOKS_SUPPORTS_PATH, "item-subscriber-404", IN_SCOPE_TENANT_ID)).toBe(404);
			expect(await repository.findOneBy({ id: "item-subscriber-404" })).toBeNull();
			expect(CreateScopeFunctionSubscriber.lifecycle).toEqual(["rollback:ROUTE"]);
		});

		it("keeps the conflict of a unique violation", async () => {
			await repository.save({ code: "code-taken", id: "item-existing", name: "Existing", tenantId: OUT_OF_SCOPE_TENANT_ID });

			expect((await postItem(HOOKS_SUPPORTS_PATH, "item-conflict", IN_SCOPE_TENANT_ID, "code-taken")).statusCode).toBe(409);
			expect(await repository.findOneBy({ id: "item-conflict" })).toBeNull();
		});
	});

	describe.each(scopedRoutes.filter(({ mode }) => mode === EApiAuthorizationMode.IAM))("IAM Deny under route transaction mode $transactionMode", ({ path }: { path: string }) => {
		it("denies the whole request for a resource key without persisting a row", async () => {
			statements = [
				allowCreateInTenant,
				{
					Action: [`${POLICY_NAMESPACE}:create`],
					Condition: { StringEquals: { "resource.tenantId": OUT_OF_SCOPE_TENANT_ID } },
					Effect: EApiPolicyEffect.DENY,
					Resource: ["create-scope:item/*"],
				},
			];

			expect(await createItem(path, "item-denied", IN_SCOPE_TENANT_ID)).toBe(403);
			expect(await repository.findOneBy({ id: "item-denied" })).toBeNull();
		});

		it("does not apply a Deny that names a concrete resource", async () => {
			statements = [
				allowCreateInTenant,
				{
					Action: [`${POLICY_NAMESPACE}:create`],
					Effect: EApiPolicyEffect.DENY,
					Resource: ["create-scope:item/item-row-denied"],
				},
			];

			expect(await createItem(path, "item-row-denied", IN_SCOPE_TENANT_ID)).toBe(201);
			expect(await repository.findOneBy({ id: "item-row-denied" })).toMatchObject({ tenantId: IN_SCOPE_TENANT_ID });
		});
	});
});
