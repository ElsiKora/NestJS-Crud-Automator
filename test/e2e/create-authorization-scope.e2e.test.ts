import "reflect-metadata";

import type { ExecutionContext, INestApplication, Type } from "@nestjs/common";
import type { IAuthGuard } from "@nestjs/passport";
import type { IApiAuthorizationRuleContext, IApiPolicyAttachmentSource, IApiPolicyDocumentRecord, IApiPolicyDocumentSource, IApiPolicyStatement } from "../../src/index";
import type { Repository } from "typeorm";

import { Inject, Injectable, Module } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { InjectRepository, getRepositoryToken, TypeOrmModule } from "@nestjs/typeorm";
import { Column, Entity, PrimaryColumn } from "typeorm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiAuthorizationPolicy, ApiAuthorizationPolicyBase, ApiController, ApiControllerSecurable, ApiPropertyDescribe, ApiService, ApiServiceBase, ApiSubscriberModule, AuthorizationResolveDefaultPrincipal, EApiAuthenticationType, EApiAuthorizationMode, EApiAuthorizationPrincipalType, EApiFunctionTransactionMode, EApiPolicyEffect, EApiPolicySourceType, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "../../src/index";

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
@ApiService({ entity: CreateScopeItemEntity })
class CreateScopeItemService extends ApiServiceBase<CreateScopeItemEntity> {
	@InjectRepository(CreateScopeItemEntity)
	public readonly repository!: Repository<CreateScopeItemEntity>;
}

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
	public onBeforeCreate() {
		return this.allow({
			scope: (context: IApiAuthorizationRuleContext<CreateScopeItemEntity>) => ({
				where: { tenantId: (context.principal.attributes as { tenantId: string }).tenantId },
			}),
		});
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

const allowCreateInTenant: IApiPolicyStatement = {
	Action: [`${POLICY_NAMESPACE}:create`],
	Condition: { StringEquals: { "resource.tenantId": "${principal.attributes.tenantId}" } },
	Effect: EApiPolicyEffect.ALLOW,
	Resource: ["create-scope:item/*"],
};

function createScopeController(path: string, mode: EApiAuthorizationMode, transactionMode: EApiFunctionTransactionMode): Type<unknown> {
	@ApiControllerSecurable()
	@ApiController<CreateScopeItemEntity>({
		authorization: { ...createScopeAuthorization, defaultMode: mode },
		entity: CreateScopeItemEntity,
		name: `CreateScope${mode}${transactionMode}`,
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
		@Inject(CreateScopeItemService)
		public readonly service!: CreateScopeItemService;
	}

	return CreateScopeController;
}

const routes: Array<{ mode: EApiAuthorizationMode; path: string; transactionMode: EApiFunctionTransactionMode }> = [
	{ mode: EApiAuthorizationMode.HOOKS, path: "create-scope-hooks-supports", transactionMode: EApiFunctionTransactionMode.SUPPORTS },
	{ mode: EApiAuthorizationMode.HOOKS, path: "create-scope-hooks-required", transactionMode: EApiFunctionTransactionMode.REQUIRED },
	{ mode: EApiAuthorizationMode.IAM, path: "create-scope-iam-supports", transactionMode: EApiFunctionTransactionMode.SUPPORTS },
	{ mode: EApiAuthorizationMode.IAM, path: "create-scope-iam-required", transactionMode: EApiFunctionTransactionMode.REQUIRED },
];

describe("Generated CREATE authorization scope (E2E)", () => {
	let app: INestApplication;
	let fastify: {
		inject: (options: { method: string; payload?: unknown; url: string }) => Promise<{ statusCode: number }>;
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

	async function createItem(path: string, id: string, tenantId: string): Promise<number> {
		const response = await fastify.inject({
			method: "POST",
			payload: { id, name: "Item", tenantId },
			url: `/${path}`,
		});

		return response.statusCode;
	}

	beforeAll(async () => {
		@Module({
			controllers: routes.map(({ mode, path, transactionMode }) => createScopeController(path, mode, transactionMode)),
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
			providers: [CreateScopeAuthGuard, CreateScopeItemService, CreateScopePolicy],
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
	});

	afterAll(async () => {
		await app.close();
	});

	describe.each(routes)("$mode scope under route transaction mode $transactionMode", ({ path }: { path: string }) => {
		it("creates a row inside the scope", async () => {
			expect(await createItem(path, "item-in-scope", IN_SCOPE_TENANT_ID)).toBe(201);
			expect(await repository.findOneBy({ id: "item-in-scope" })).toMatchObject({ tenantId: IN_SCOPE_TENANT_ID });
		});

		it("does not persist a row outside the scope", async () => {
			expect(await createItem(path, "item-out-of-scope", OUT_OF_SCOPE_TENANT_ID)).toBe(404);
			expect(await repository.findOneBy({ id: "item-out-of-scope" })).toBeNull();
		});
	});

	describe.each(routes.filter(({ mode }) => mode === EApiAuthorizationMode.IAM))("IAM resource Deny under route transaction mode $transactionMode", ({ path }: { path: string }) => {
		it("denies the whole request without persisting a row", async () => {
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
	});
});
