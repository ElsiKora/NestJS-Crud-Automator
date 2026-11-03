import "reflect-metadata";

import type { ExecutionContext, INestApplication, Type } from "@nestjs/common";
import type { IAuthGuard } from "@nestjs/passport";
import type { IApiAuthorizationPolicySubscriberContext, IApiAuthorizationRuleContext, IApiPolicyAttachmentSource, IApiPolicyDocumentRecord, IApiPolicyDocumentSource, IApiPolicyStatement } from "../../src/index";
import type { Repository } from "typeorm";

import { Inject, Injectable, Module } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { InjectRepository, getRepositoryToken, TypeOrmModule } from "@nestjs/typeorm";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
	ApiAuthorizationModule,
	ApiAuthorizationPolicy,
	ApiAuthorizationPolicyBase,
	ApiController,
	ApiControllerSecurable,
	ApiPropertyDescribe,
	ApiService,
	ApiServiceBase,
	ApiSubscriberModule,
	AuthorizationResolveDefaultPrincipal,
	CamelCaseString,
	EApiAuthenticationType,
	EApiAuthorizationMode,
	EApiAuthorizationPrincipalType,
	EApiControllerRelationReferenceShape,
	EApiFunctionTransactionMode,
	EApiFunctionType,
	EApiFunctionUpdatePersistenceMode,
	EApiPolicyEffect,
	EApiPolicySourceType,
	EApiPropertyDescribeType,
	EApiPropertyStringType,
	EApiRouteType,
} from "../../src/index";

const ACTIVE_STATUS: string = "active";
const ARCHIVED_STATUS: string = "archived";
const IN_SCOPE_TENANT_ID: string = "tenant-1";
const OUT_OF_SCOPE_TENANT_ID: string = "tenant-2";
const OWNER_ID: string = "owner-1";
const POLICY_ID: string = "update-scope-policy";
const POLICY_NAMESPACE: string = "update-scope:item";

let isBodyTenantDenied: boolean = false;

function describeRelationProperty(entity: new () => unknown, description: string): PropertyDecorator {
	return ApiPropertyDescribe({
		description,
		relationMetadata: {
			entity,
			isEager: false,
			relationType: "many-to-one",
		},
		type: EApiPropertyDescribeType.RELATION,
	} as unknown as {
		description: string;
		type: EApiPropertyDescribeType.RELATION;
	});
}

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

@Entity("update_scope_owners")
class UpdateScopeOwnerEntity {
	@PrimaryColumn({ type: "varchar" })
	@describeStringProperty("id", OWNER_ID)
	public id!: string;

	@Column({ type: "varchar" })
	@describeStringProperty("name", "Owner")
	public name!: string;
}

@Entity("update_scope_items")
class UpdateScopeItemEntity {
	@PrimaryColumn({ type: "varchar" })
	@describeStringProperty("id", "item-1")
	public id!: string;

	@Column({ type: "varchar" })
	@describeStringProperty("name", "Item")
	public name!: string;

	@ManyToOne(() => UpdateScopeOwnerEntity)
	@JoinColumn({ name: "ownerId" })
	@describeRelationProperty(UpdateScopeOwnerEntity, "owner")
	public owner?: UpdateScopeOwnerEntity;

	@Column({ nullable: true, type: "varchar" })
	public ownerId?: string;

	@Column({ default: ACTIVE_STATUS, type: "varchar" })
	@describeStringProperty("status", ACTIVE_STATUS)
	public status?: string;

	@Column({ type: "varchar" })
	@describeStringProperty("tenantId", IN_SCOPE_TENANT_ID)
	public tenantId!: string;
}

@Injectable()
@ApiService({ entity: UpdateScopeItemEntity })
class UpdateScopeItemService extends ApiServiceBase<UpdateScopeItemEntity> {
	@InjectRepository(UpdateScopeItemEntity)
	public readonly repository!: Repository<UpdateScopeItemEntity>;
}

@Injectable()
@ApiService({
	entity: UpdateScopeItemEntity,
	functions: { [EApiFunctionType.UPDATE]: { transaction: { mode: EApiFunctionTransactionMode.REQUIRED } } },
})
class UpdateScopeFunctionRequiredItemService extends ApiServiceBase<UpdateScopeItemEntity> {
	@InjectRepository(UpdateScopeItemEntity)
	public readonly repository!: Repository<UpdateScopeItemEntity>;
}

@Injectable()
@ApiService({
	entity: UpdateScopeItemEntity,
	functions: { [EApiFunctionType.UPDATE]: { persistenceMode: EApiFunctionUpdatePersistenceMode.PATCH, transaction: { mode: EApiFunctionTransactionMode.REQUIRED } } },
})
class UpdateScopeFunctionPatchItemService extends ApiServiceBase<UpdateScopeItemEntity> {
	@InjectRepository(UpdateScopeItemEntity)
	public readonly repository!: Repository<UpdateScopeItemEntity>;
}

@Injectable()
class UpdateScopeAuthGuard implements IAuthGuard {
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
@ApiAuthorizationPolicy({ entity: UpdateScopeItemEntity })
class UpdateScopePolicy extends ApiAuthorizationPolicyBase<UpdateScopeItemEntity> {
	public onBeforePartialUpdate(context: IApiAuthorizationPolicySubscriberContext<UpdateScopeItemEntity>) {
		return this.resolveUpdateRule(context);
	}

	public onBeforeUpdate(context: IApiAuthorizationPolicySubscriberContext<UpdateScopeItemEntity>) {
		return this.resolveUpdateRule(context);
	}

	private resolveUpdateRule(context: IApiAuthorizationPolicySubscriberContext<UpdateScopeItemEntity>) {
		const bodyTenantId: string | undefined = (context.body as { tenantId?: string } | undefined)?.tenantId;

		if (isBodyTenantDenied && bodyTenantId !== undefined && bodyTenantId !== (context.principal.attributes as { tenantId: string }).tenantId) {
			return this.deny();
		}

		return this.allow({
			scope: (ruleContext: IApiAuthorizationRuleContext<UpdateScopeItemEntity>) => ({
				where: { tenantId: (ruleContext.principal.attributes as { tenantId: string }).tenantId },
			}),
		});
	}
}

const updateScopeAuthorization = {
	policyNamespace: POLICY_NAMESPACE,
	resourceDefinition: {
		entity: UpdateScopeItemEntity,
		fields: [
			{ isFilterable: true, path: "resource.id", queryPath: "id" },
			{ isFilterable: true, path: "resource.status", queryPath: "status" },
			{ isFilterable: true, path: "resource.tenantId", queryPath: "tenantId" },
		],
		namespace: POLICY_NAMESPACE,
		resourcePath: "update-scope:item/{id}",
		resourceType: "update-scope:item",
	},
};

const allowUpdateInTenant: IApiPolicyStatement = {
	Action: [`${POLICY_NAMESPACE}:update`],
	Condition: { StringEquals: { "resource.tenantId": "${principal.attributes.tenantId}" } },
	Effect: EApiPolicyEffect.ALLOW,
	Resource: ["update-scope:item/*"],
};

const denyForeignBodyTenant: IApiPolicyStatement = {
	Action: [`${POLICY_NAMESPACE}:update`],
	Condition: { StringNotEquals: { "request.body.tenantId": "${principal.attributes.tenantId}" } },
	Effect: EApiPolicyEffect.DENY,
	Resource: ["update-scope:item/*"],
};

const denyArchivedRows: IApiPolicyStatement = {
	Action: [`${POLICY_NAMESPACE}:update`],
	Condition: { StringEquals: { "resource.status": ARCHIVED_STATUS } },
	Effect: EApiPolicyEffect.DENY,
	Resource: ["update-scope:item/*"],
};

interface IUpdateScopeRoute {
	functionLabel: string;
	isResponseReloaded: boolean;
	mode: EApiAuthorizationMode;
	path: string;
	service: Type<ApiServiceBase<UpdateScopeItemEntity>>;
	transactionMode: EApiFunctionTransactionMode;
}

function createScopeController({ isResponseReloaded, mode, path, service, transactionMode }: IUpdateScopeRoute): Type<unknown> {
	const routeConfig = {
		...(isResponseReloaded ? { relations: { response: { load: { include: { owner: true } }, reference: { key: "id", shape: EApiControllerRelationReferenceShape.OBJECT } } } } : {}),
		security: { authentication: { guard: UpdateScopeAuthGuard, type: EApiAuthenticationType.USER } },
		transaction: { mode: transactionMode },
	};

	class UpdateScopeController {
		@Inject(service)
		public readonly service!: ApiServiceBase<UpdateScopeItemEntity>;
	}

	// Every controller of one application needs its own class name, because the name starts its generated DTO names.
	Object.defineProperty(UpdateScopeController, "name", { value: `${CamelCaseString(path)}Controller` });

	const controller = ApiController<UpdateScopeItemEntity>({
		authorization: { ...updateScopeAuthorization, defaultMode: mode },
		entity: UpdateScopeItemEntity,
		name: path,
		path,
		routes: {
			[EApiRouteType.CREATE]: { generation: { isEnabled: false } },
			[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
			[EApiRouteType.GET]: { generation: { isEnabled: false } },
			[EApiRouteType.GET_LIST]: { generation: { isEnabled: false } },
			[EApiRouteType.PARTIAL_UPDATE]: routeConfig,
			[EApiRouteType.UPDATE]: routeConfig,
		},
	} as never)(UpdateScopeController);
	ApiControllerSecurable()(controller);

	return controller as Type<unknown>;
}

const baseRoute = { functionLabel: "default", service: UpdateScopeItemService };

const routes: Array<IUpdateScopeRoute> = [
	{ ...baseRoute, isResponseReloaded: false, mode: EApiAuthorizationMode.HOOKS, path: "update-scope-hooks-supports", transactionMode: EApiFunctionTransactionMode.SUPPORTS },
	{ ...baseRoute, isResponseReloaded: false, mode: EApiAuthorizationMode.HOOKS, path: "update-scope-hooks-required", transactionMode: EApiFunctionTransactionMode.REQUIRED },
	{ ...baseRoute, isResponseReloaded: false, mode: EApiAuthorizationMode.IAM, path: "update-scope-iam-supports", transactionMode: EApiFunctionTransactionMode.SUPPORTS },
	{ ...baseRoute, isResponseReloaded: false, mode: EApiAuthorizationMode.IAM, path: "update-scope-iam-required", transactionMode: EApiFunctionTransactionMode.REQUIRED },
	{ ...baseRoute, isResponseReloaded: true, mode: EApiAuthorizationMode.HOOKS, path: "update-scope-hooks-supports-reload", transactionMode: EApiFunctionTransactionMode.SUPPORTS },
	{ ...baseRoute, isResponseReloaded: true, mode: EApiAuthorizationMode.HOOKS, path: "update-scope-hooks-required-reload", transactionMode: EApiFunctionTransactionMode.REQUIRED },
	{ ...baseRoute, isResponseReloaded: true, mode: EApiAuthorizationMode.IAM, path: "update-scope-iam-supports-reload", transactionMode: EApiFunctionTransactionMode.SUPPORTS },
	{ ...baseRoute, isResponseReloaded: true, mode: EApiAuthorizationMode.IAM, path: "update-scope-iam-required-reload", transactionMode: EApiFunctionTransactionMode.REQUIRED },
	{ functionLabel: "function REQUIRED", isResponseReloaded: true, mode: EApiAuthorizationMode.HOOKS, path: "update-scope-hooks-function-required-reload", service: UpdateScopeFunctionRequiredItemService, transactionMode: EApiFunctionTransactionMode.SUPPORTS },
	{ functionLabel: "function REQUIRED", isResponseReloaded: true, mode: EApiAuthorizationMode.IAM, path: "update-scope-iam-function-required-reload", service: UpdateScopeFunctionRequiredItemService, transactionMode: EApiFunctionTransactionMode.SUPPORTS },
	{ functionLabel: "function REQUIRED PATCH persistence", isResponseReloaded: true, mode: EApiAuthorizationMode.HOOKS, path: "update-scope-hooks-function-patch-reload", service: UpdateScopeFunctionPatchItemService, transactionMode: EApiFunctionTransactionMode.SUPPORTS },
	{ functionLabel: "function REQUIRED PATCH persistence", isResponseReloaded: true, mode: EApiAuthorizationMode.IAM, path: "update-scope-iam-function-patch-reload", service: UpdateScopeFunctionPatchItemService, transactionMode: EApiFunctionTransactionMode.SUPPORTS },
];

const scopedRoutes: Array<IUpdateScopeRoute & { httpMethod: "PATCH" | "PUT" }> = routes.flatMap((route: IUpdateScopeRoute) => [
	{ ...route, httpMethod: "PATCH" as const },
	{ ...route, httpMethod: "PUT" as const },
]);

describe("Generated UPDATE authorization scope (E2E)", () => {
	let app: INestApplication;
	let fastify: {
		inject: (options: { method: string; payload?: unknown; url: string }) => Promise<{ statusCode: number }>;
	};
	let ownerRepository: Repository<UpdateScopeOwnerEntity>;
	let repository: Repository<UpdateScopeItemEntity>;
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

	async function updateItem(route: { httpMethod: "PATCH" | "PUT"; path: string }, id: string, payload: { name: string; tenantId: string }): Promise<{ name?: string; status: number; tenantId?: string }> {
		const response = await fastify.inject({ method: route.httpMethod, payload, url: `/${route.path}/${id}` });
		const stored: UpdateScopeItemEntity | null = await repository.findOneBy({ id });

		return { name: stored?.name, status: response.statusCode, tenantId: stored?.tenantId };
	}

	beforeAll(async () => {
		@Module({
			controllers: routes.map((route: IUpdateScopeRoute) => createScopeController(route)),
			imports: [
				TypeOrmModule.forRoot({
					database: ":memory:",
					dropSchema: true,
					entities: [UpdateScopeItemEntity, UpdateScopeOwnerEntity],
					logging: false,
					synchronize: true,
					type: "better-sqlite3",
				}),
				TypeOrmModule.forFeature([UpdateScopeItemEntity, UpdateScopeOwnerEntity]),
				ApiAuthorizationModule.forRoot({
					iam: {
						attachmentSources: [attachmentSource],
						documentSources: [documentSource],
					},
					principalResolver: { resolve: (user: unknown) => AuthorizationResolveDefaultPrincipal(user) },
				}),
				ApiSubscriberModule,
			],
			providers: [UpdateScopeAuthGuard, UpdateScopeFunctionPatchItemService, UpdateScopeFunctionRequiredItemService, UpdateScopeItemService, UpdateScopePolicy],
		})
		class UpdateScopeAppModule {}

		const moduleRef = await Test.createTestingModule({ imports: [UpdateScopeAppModule] }).compile();

		app = moduleRef.createNestApplication(new FastifyAdapter());
		await app.init();

		fastify = app.getHttpAdapter().getInstance();
		ownerRepository = app.get(getRepositoryToken(UpdateScopeOwnerEntity));
		repository = app.get(getRepositoryToken(UpdateScopeItemEntity));

		await ownerRepository.save({ id: OWNER_ID, name: "Owner" });
	});

	beforeEach(async () => {
		await repository.clear();
		await repository.save([
			{ id: "item-in-scope", name: "Original", ownerId: OWNER_ID, tenantId: IN_SCOPE_TENANT_ID },
			{ id: "item-out-of-scope", name: "Original", ownerId: OWNER_ID, tenantId: OUT_OF_SCOPE_TENANT_ID },
		]);
		isBodyTenantDenied = false;
		statements = [allowUpdateInTenant];
	});

	afterAll(async () => {
		await app.close();
	});

	describe.each(scopedRoutes)("$mode $httpMethod under route $transactionMode, $functionLabel, response reload $isResponseReloaded", (route: IUpdateScopeRoute & { httpMethod: "PATCH" | "PUT" }) => {
		it("updates a row that stays inside the scope", async () => {
			expect(await updateItem(route, "item-in-scope", { name: "Changed", tenantId: IN_SCOPE_TENANT_ID })).toEqual({ name: "Changed", status: 200, tenantId: IN_SCOPE_TENANT_ID });
		});

		it("answers 404 for an old row outside the scope and leaves it unchanged", async () => {
			expect(await updateItem(route, "item-out-of-scope", { name: "Changed", tenantId: IN_SCOPE_TENANT_ID })).toEqual({ name: "Original", status: 404, tenantId: OUT_OF_SCOPE_TENANT_ID });
		});

		it("refuses a body that moves the row out of the scope and leaves it unchanged", async () => {
			expect(await updateItem(route, "item-in-scope", { name: "Changed", tenantId: OUT_OF_SCOPE_TENANT_ID })).toEqual({ name: "Original", status: 403, tenantId: IN_SCOPE_TENANT_ID });
		});

		it("refuses the same body when the policy explicitly denies the field", async () => {
			isBodyTenantDenied = true;
			statements = [allowUpdateInTenant, denyForeignBodyTenant];

			expect(await updateItem(route, "item-in-scope", { name: "Changed", tenantId: OUT_OF_SCOPE_TENANT_ID })).toEqual({ name: "Original", status: 403, tenantId: IN_SCOPE_TENANT_ID });
		});
	});

	describe.each(routes.filter(({ isResponseReloaded, mode }: IUpdateScopeRoute) => mode === EApiAuthorizationMode.IAM && !isResponseReloaded))("IAM resource Deny on a mutable field under route transaction mode $transactionMode", ({ path }: IUpdateScopeRoute) => {
		async function archiveItem(id: string): Promise<{ itemStatus?: string; statusCode: number }> {
			const response = await fastify.inject({ method: "PATCH", payload: { status: ARCHIVED_STATUS }, url: `/${path}/${id}` });
			const stored: UpdateScopeItemEntity | null = await repository.findOneBy({ id });

			return { itemStatus: stored?.status, statusCode: response.statusCode };
		}

		beforeEach(() => {
			statements = [allowUpdateInTenant, denyArchivedRows];
		});

		it("refuses a body that moves an active row into the denied state", async () => {
			expect(await archiveItem("item-in-scope")).toEqual({ itemStatus: ACTIVE_STATUS, statusCode: 403 });
		});

		it("answers 404 for a row that is already in the denied state", async () => {
			await repository.update({ id: "item-in-scope" }, { status: ARCHIVED_STATUS });

			expect(await archiveItem("item-in-scope")).toEqual({ itemStatus: ARCHIVED_STATUS, statusCode: 404 });
		});
	});
});
