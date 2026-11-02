import "reflect-metadata";

import type { CanActivate, ExceptionFilter, ExecutionContext, INestApplication } from "@nestjs/common";
import type { OpenAPIObject } from "@nestjs/swagger";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { Repository } from "typeorm";

import { ForbiddenException, Headers, HttpStatus, Inject, Injectable, RequestMethod, UnauthorizedException, UnprocessableEntityException, ValidationPipe } from "@nestjs/common";
import { APP_GUARD, HttpAdapterHost } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Test } from "@nestjs/testing";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { InjectRepository, TypeOrmModule } from "@nestjs/typeorm";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { Ajv } from "ajv";
import addFormats from "ajv-formats";
import { Column, Entity, JoinColumn, LessThan, ManyToOne, PrimaryColumn } from "typeorm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import type { IApiAuthenticationRequest, IApiAuthorizationPrincipal, IApiAuthorizationPrincipalResolver, IApiPolicyAttachmentSource, IApiPolicyDocumentRecord, IApiPolicyDocumentSource } from "../../src/index";

import {
	ApiAuthorizationModule,
	ApiAuthorizationPolicy,
	ApiAuthorizationPolicyBase,
	ApiController,
	ApiControllerObservable,
	ApiControllerSecurable,
	ApiMethod,
	ApiPropertyDescribe,
	ApiRouteCustom,
	ApiRouteSubscriber,
	ApiRouteSubscriberBase,
	ApiService,
	ApiServiceBase,
	ApiSubscriberModule,
	AuthorizationResolveDefaultPrincipal,
	CorrelationIDResponseBodyExceptionFilter,
	CorrelationIDResponseBodyInterceptor,
	DtoGenerateException,
	EApiAuthenticationType,
	EApiAuthorizationMode,
	EApiAuthorizationPrincipalType,
	EApiControllerGetListQueryPaginationMode,
	EApiControllerGetListQueryUnlistedFields,
	EApiControllerRelationReferenceShape,
	EApiControllerRequestTarget,
	EApiPolicyEffect,
	EApiPolicySourceType,
	EApiPropertyDescribeType,
	EApiPropertyNumberType,
	EApiPropertyStringType,
	EApiRouteType,
	EErrorStringAction,
	EFilterOperation,
	EFilterOrderDirection,
} from "../../src/index";

type TSwaggerMethod = "delete" | "get" | "patch" | "post" | "put";

interface IExceptionFilterMode {
	createFilters: (application: INestApplication) => Array<ExceptionFilter>;
	name: string;
}

interface IWireCase {
	body?: string;
	contentType?: string;
	expectedStatus: HttpStatus;
	headers?: Record<string, string>;
	method: "DELETE" | "GET" | "PATCH" | "POST" | "PUT";
	name: string;
	operation: { method: TSwaggerMethod; path: string };
	payload?: Record<string, unknown>;
	precedingRequests?: number;
	url: string;
}

const STRING_PROPERTY = {
	format: EApiPropertyStringType.STRING,
	maxLength: 64,
	minLength: 1,
	pattern: "/^.+$/",
	type: EApiPropertyDescribeType.STRING,
} as const;

@Entity("openapi_error_owners")
class OpenApiErrorOwnerEntity {
	@PrimaryColumn({ type: "uuid" })
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({ ...STRING_PROPERTY, description: "name", exampleValue: "Owner" })
	public name!: string;
}

@Entity("openapi_error_items")
class OpenApiErrorItemEntity {
	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe({ ...STRING_PROPERTY, description: "id", exampleValue: "item-1" })
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({ ...STRING_PROPERTY, description: "name", exampleValue: "Item" })
	public name!: string;

	@Column({ type: "varchar", unique: true })
	@ApiPropertyDescribe({ ...STRING_PROPERTY, description: "code", exampleValue: "code-1" })
	public code!: string;

	@Column({ nullable: true, type: "uuid" })
	@ApiPropertyDescribe({ description: "ownerId", isNullable: true, type: EApiPropertyDescribeType.UUID })
	public ownerId?: string;

	@ManyToOne(() => OpenApiErrorOwnerEntity, { nullable: true })
	@JoinColumn({ name: "ownerId" })
	@ApiPropertyDescribe({
		description: "owner",
		relationMetadata: { entity: OpenApiErrorOwnerEntity, isEager: false, relationType: "many-to-one" },
		type: EApiPropertyDescribeType.RELATION,
	} as unknown as { description: string; type: EApiPropertyDescribeType.RELATION })
	public owner?: OpenApiErrorOwnerEntity;
}

@Entity("openapi_error_secured_items")
class OpenApiErrorSecuredItemEntity {
	@PrimaryColumn({ type: "uuid" })
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@Column({ type: "int", unique: true })
	@ApiPropertyDescribe({ description: "rank", exampleValue: 1, format: EApiPropertyNumberType.INTEGER, maximum: 100, minimum: 0, multipleOf: 1, type: EApiPropertyDescribeType.NUMBER })
	public rank!: number;
}

@Entity("openapi_error_iam_items")
class OpenApiErrorIamItemEntity {
	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe({ ...STRING_PROPERTY, description: "id", exampleValue: "iam-1" })
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({ ...STRING_PROPERTY, description: "name", exampleValue: "Item" })
	public name!: string;
}

@Injectable()
@ApiService({ entity: OpenApiErrorOwnerEntity })
class OpenApiErrorOwnerService extends ApiServiceBase<OpenApiErrorOwnerEntity> {
	@InjectRepository(OpenApiErrorOwnerEntity)
	public readonly repository!: Repository<OpenApiErrorOwnerEntity>;
}

@Injectable()
@ApiService({ entity: OpenApiErrorItemEntity })
class OpenApiErrorItemService extends ApiServiceBase<OpenApiErrorItemEntity> {
	@InjectRepository(OpenApiErrorItemEntity)
	public readonly repository!: Repository<OpenApiErrorItemEntity>;
}

@Injectable()
@ApiService({ entity: OpenApiErrorSecuredItemEntity })
class OpenApiErrorSecuredItemService extends ApiServiceBase<OpenApiErrorSecuredItemEntity> {
	@InjectRepository(OpenApiErrorSecuredItemEntity)
	public readonly repository!: Repository<OpenApiErrorSecuredItemEntity>;
}

@Injectable()
@ApiService({ entity: OpenApiErrorIamItemEntity })
class OpenApiErrorIamItemService extends ApiServiceBase<OpenApiErrorIamItemEntity> {
	@InjectRepository(OpenApiErrorIamItemEntity)
	public readonly repository!: Repository<OpenApiErrorIamItemEntity>;
}

/**
 * Authenticates the `x-user-id` header and fails with an unexpected error on the `x-auth-crash` header.
 */
@Injectable()
class OpenApiErrorAuthenticationGuard implements CanActivate {
	public canActivate(context: ExecutionContext): boolean {
		const request: { headers: Record<string, string | undefined>; user?: unknown } = context.switchToHttp().getRequest();
		const userId: string | undefined = request.headers["x-user-id"];

		if (request.headers["x-auth-crash"]) {
			throw new Error("authentication backend failure");
		}

		if (!userId) {
			throw new UnauthorizedException();
		}

		request.user = { id: userId, roles: request.headers["x-role"] ? [request.headers["x-role"]] : [] };

		return true;
	}
}

/**
 * Refuses every request that carries the `x-block` header by returning false, which Nest answers with its own 403, and fails on the `x-guard-crash` header.
 */
@Injectable()
class OpenApiErrorBlockGuard implements CanActivate {
	public canActivate(context: ExecutionContext): boolean {
		const request: { headers: Record<string, string | undefined> } = context.switchToHttp().getRequest();

		if (request.headers["x-guard-crash"]) {
			throw new Error("guard failure");
		}

		if (request.headers["x-guard-reject"]) {
			throw new UnauthorizedException();
		}

		return !request.headers["x-block"];
	}
}

@Injectable()
@ApiAuthorizationPolicy({ entity: OpenApiErrorSecuredItemEntity })
class OpenApiErrorSecuredItemPolicy extends ApiAuthorizationPolicyBase<OpenApiErrorSecuredItemEntity> {
	// Custom routes reach their handler for admins only
	public getCustomActionRule() {
		return this.allowForRoles(["admin"]);
	}

	// A rank of 100 is valid and lands outside this scope, so the read back of the new row finds nothing
	public onBeforeCreate() {
		return this.allowForRoles(["admin"], { scope: () => ({ where: { rank: LessThan(100) } }) });
	}

	public onBeforeDelete() {
		return this.allowForRoles(["admin"]);
	}

	public onBeforeGet() {
		return this.allowForRoles(["admin"]);
	}

	public onBeforeGetList() {
		return this.allowForRoles(["admin"]);
	}

	public onBeforePartialUpdate() {
		return this.allowForRoles(["admin"]);
	}

	public onBeforeUpdate() {
		return this.allowForRoles(["admin"]);
	}
}

/**
 * Fails every generated route that receives the `x-explode` header, to reproduce an unexpected `500`, and refuses one with the `x-forbid` header from the handler.
 * @param {{ result: { headers?: Record<string, string> } }} context - Route BEFORE context.
 * @param {{ result: { headers?: Record<string, string> } }} context.result - Route targets.
 * @returns {unknown} The unchanged targets.
 */
function explodeOnHeader<T extends { headers?: Record<string, string> }>(context: { result: T }): T {
	if (context.result.headers?.["x-explode"]) {
		throw new Error("unexpected failure");
	}

	if (context.result.headers?.["x-forbid"]) {
		throw new ForbiddenException();
	}

	return context.result;
}

/**
 * Fails a custom route handler that receives the `x-explode` header, to reproduce an unexpected `500`.
 * @param {Record<string, string | undefined>} headers - Request headers.
 */
function explodeOnCustomHeader(headers: Record<string, string | undefined>): void {
	if (headers["x-explode"]) {
		throw new Error("unexpected failure");
	}
}

@Injectable()
@ApiRouteSubscriber({ entity: OpenApiErrorItemEntity })
class OpenApiErrorItemRouteSubscriber extends ApiRouteSubscriberBase<OpenApiErrorItemEntity> {
	public onBeforeCreate = explodeOnHeader;

	public onBeforeDelete = explodeOnHeader;

	public onBeforeGet = explodeOnHeader;

	public onBeforeGetList = explodeOnHeader;

	public onBeforePartialUpdate = explodeOnHeader;

	public onBeforeUpdate = explodeOnHeader;
}

@Injectable()
@ApiRouteSubscriber({ entity: OpenApiErrorSecuredItemEntity })
class OpenApiErrorSecuredItemRouteSubscriber extends ApiRouteSubscriberBase<OpenApiErrorSecuredItemEntity> {
	public onBeforeCreate = explodeOnHeader;

	public onBeforeDelete = explodeOnHeader;

	public onBeforeGet = explodeOnHeader;

	public onBeforeGetList = explodeOnHeader;

	public onBeforePartialUpdate = explodeOnHeader;

	public onBeforeUpdate = explodeOnHeader;
}

const IAM_ALLOWED_USER: string = "iam-allowed";
const IAM_CRASH_USER: string = "iam-crash";
const IAM_NAMESPACE: string = "openapi-error:iam";

// The crash user is attached to a policy whose document source fails
const iamAttachmentSource: IApiPolicyAttachmentSource = {
	getAttachments(principal) {
		const policyId: string | undefined = ({ [IAM_ALLOWED_USER]: "allow", [IAM_CRASH_USER]: "crash" } as Record<string, string>)[principal.id];

		return Promise.resolve({ attachments: policyId ? [{ policyId, principalId: principal.id, principalType: EApiAuthorizationPrincipalType.USER }] : [], boundaries: [] });
	},
};

const iamDocumentSource: IApiPolicyDocumentSource = {
	getDocumentsByIds(ids: ReadonlyArray<string>): Promise<ReadonlyArray<IApiPolicyDocumentRecord>> {
		if (ids.includes("crash")) {
			return Promise.reject(new Error("policy store failure"));
		}

		return Promise.resolve(ids.includes("allow") ? [{ document: { Statement: [{ Action: [`${IAM_NAMESPACE}:*`], Effect: EApiPolicyEffect.ALLOW, Resource: [`${IAM_NAMESPACE}/*`] }], Version: "2012-10-17" }, id: "allow", namespace: IAM_NAMESPACE, sourceType: EApiPolicySourceType.MANAGED, version: "1" }] : []);
	},
};

// The authorization guard fails on the x-principal-crash header, also on routes without authentication
const principalResolver: IApiAuthorizationPrincipalResolver = {
	resolve(user: unknown, request?: IApiAuthenticationRequest): IApiAuthorizationPrincipal {
		if ((request as { headers?: Record<string, string | undefined> } | undefined)?.headers?.["x-principal-crash"]) {
			throw new Error("principal store failure");
		}

		return AuthorizationResolveDefaultPrincipal(user);
	},
};

const authentication = { guard: OpenApiErrorAuthenticationGuard, type: EApiAuthenticationType.USER };
const execution = { guards: [OpenApiErrorBlockGuard] };

@ApiControllerObservable()
@ApiController<OpenApiErrorItemEntity>({
	entity: OpenApiErrorItemEntity,
	name: "OpenApiErrorItems",
	path: "openapi-error-items",
	routes: {
		[EApiRouteType.CREATE]: {
			relations: {
				request: {
					load: { include: { owner: true } },
					reference: { shape: EApiControllerRelationReferenceShape.SCALAR },
				},
			},
			request: {
				[EApiControllerRequestTarget.BODY]: {
					validators: [
						{
							errorType: EErrorStringAction.VALIDATION_ERROR,
							exception: UnprocessableEntityException,
							validationFunction: (payload) => !("name" in payload) || payload.name !== "rejected",
						},
					],
				},
			},
		},
		// Guards on a controller without authorization
		[EApiRouteType.GET]: { execution, security: { authentication } },
		[EApiRouteType.GET_LIST]: {
			request: {
				[EApiControllerRequestTarget.QUERY]: {
					filter: {
						fields: { name: { allowedOperations: [EFilterOperation.EQ], isEnabled: true } },
						unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
					},
				},
			},
		},
	},
})
class OpenApiErrorItemController {
	@Inject(OpenApiErrorItemService)
	public readonly service!: OpenApiErrorItemService;

	@Inject(OpenApiErrorOwnerService)
	public readonly ownerService!: OpenApiErrorOwnerService;

	@ApiRouteCustom<OpenApiErrorItemEntity>({
		resource: { action: "items.summary", entity: OpenApiErrorItemEntity },
		response: { status: HttpStatus.OK, type: undefined },
		route: { method: RequestMethod.GET, path: "custom/summary" },
	})
	public summary(@Headers() headers: Record<string, string | undefined>): { isReady: boolean } {
		explodeOnCustomHeader(headers);

		return { isReady: true };
	}

	@ApiRouteCustom<OpenApiErrorItemEntity>({
		resource: { action: "items.throttled", entity: OpenApiErrorItemEntity },
		response: { status: HttpStatus.OK, type: undefined },
		route: { method: RequestMethod.GET, path: "custom/throttled" },
		throttling: { default: { limit: 1, ttl: 60_000 } },
	})
	public throttled(@Headers() headers: Record<string, string | undefined>): { isReady: boolean } {
		explodeOnCustomHeader(headers);

		return { isReady: true };
	}

	@ApiRouteCustom<OpenApiErrorItemEntity>({
		execution,
		resource: { action: "items.guarded", entity: OpenApiErrorItemEntity },
		response: { status: HttpStatus.OK, type: undefined },
		route: { method: RequestMethod.GET, path: "custom/guarded" },
	})
	public guarded(@Headers() headers: Record<string, string | undefined>): { isReady: boolean } {
		explodeOnCustomHeader(headers);

		return { isReady: true };
	}
}

/**
 * Custom route that a securable and a plain controller of the same entity both inherit.
 */
class OpenApiErrorSharedStatusRoutes {
	@ApiRouteCustom<OpenApiErrorSecuredItemEntity>({
		resource: { action: "secured-items.status", entity: OpenApiErrorSecuredItemEntity },
		response: { status: HttpStatus.OK, type: undefined },
		route: { method: RequestMethod.GET, path: "custom/status" },
	})
	public status(@Headers() headers: Record<string, string | undefined>): { isShared: boolean } {
		explodeOnCustomHeader(headers);

		return { isShared: true };
	}
}

@ApiControllerObservable()
@ApiControllerSecurable()
@ApiController<OpenApiErrorSecuredItemEntity>({
	authorization: { defaultMode: EApiAuthorizationMode.HOOKS },
	entity: OpenApiErrorSecuredItemEntity,
	name: "OpenApiErrorSecuredItems",
	path: "openapi-error-secured-items",
	routes: {
		[EApiRouteType.CREATE]: { execution, security: { authentication } },
		[EApiRouteType.DELETE]: { execution, security: { authentication } },
		[EApiRouteType.GET]: { execution, security: { authentication } },
		[EApiRouteType.GET_LIST]: {
			execution,
			request: {
				[EApiControllerRequestTarget.QUERY]: {
					order: {
						defaultOrder: [{ direction: EFilterOrderDirection.ASC, field: "rank" }],
						fields: { rank: { isEnabled: true } },
						tieBreakers: [{ direction: EFilterOrderDirection.ASC, field: "id" }],
						unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
					},
					pagination: { mode: EApiControllerGetListQueryPaginationMode.CURSOR },
				},
			},
			security: { authentication },
		},
		[EApiRouteType.PARTIAL_UPDATE]: { execution, security: { authentication } },
		[EApiRouteType.UPDATE]: { execution, security: { authentication } },
	},
})
class OpenApiErrorSecuredItemController extends OpenApiErrorSharedStatusRoutes {
	@Inject(OpenApiErrorSecuredItemService)
	public readonly service!: OpenApiErrorSecuredItemService;

	@ApiRouteCustom<OpenApiErrorSecuredItemEntity>({
		resource: { action: "secured-items.export", entity: OpenApiErrorSecuredItemEntity },
		response: { status: HttpStatus.OK, type: undefined },
		route: { method: RequestMethod.GET, path: "custom/export" },
		security: { authentication },
	})
	public export(@Headers() headers: Record<string, string | undefined>): { isExported: boolean } {
		explodeOnCustomHeader(headers);

		return { isExported: true };
	}

	@ApiMethod<OpenApiErrorSecuredItemEntity>({
		metadata: {
			resource: { action: "secured-items.ping", entity: OpenApiErrorSecuredItemEntity },
			response: { status: HttpStatus.OK, type: undefined },
			route: { method: RequestMethod.GET, path: "custom/ping" },
		},
	})
	public ping(@Headers() headers: Record<string, string | undefined>): { isPinged: boolean } {
		explodeOnCustomHeader(headers);

		return { isPinged: true };
	}
}

@ApiController<OpenApiErrorSecuredItemEntity>({
	entity: OpenApiErrorSecuredItemEntity,
	name: "OpenApiErrorPublicItems",
	path: "openapi-error-public-items",
	routes: {
		[EApiRouteType.CREATE]: { generation: { isEnabled: false } },
		[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
		[EApiRouteType.GET]: { generation: { isEnabled: false } },
		[EApiRouteType.GET_LIST]: { generation: { isEnabled: false } },
		[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
		[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
	},
})
class OpenApiErrorPublicItemController extends OpenApiErrorSharedStatusRoutes {
	@Inject(OpenApiErrorSecuredItemService)
	public readonly service!: OpenApiErrorSecuredItemService;
}

@ApiControllerSecurable()
@ApiController<OpenApiErrorIamItemEntity>({
	authorization: {
		defaultMode: EApiAuthorizationMode.IAM,
		policyNamespace: IAM_NAMESPACE,
		resourceDefinition: { entity: OpenApiErrorIamItemEntity, fields: [{ isFilterable: true, path: "resource.id", queryPath: "id" }], namespace: IAM_NAMESPACE, resourcePath: `${IAM_NAMESPACE}/{id}`, resourceType: IAM_NAMESPACE },
	},
	entity: OpenApiErrorIamItemEntity,
	name: "OpenApiErrorIamItems",
	path: "openapi-error-iam-items",
	routes: {
		[EApiRouteType.CREATE]: { generation: { isEnabled: false } },
		[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
		[EApiRouteType.GET]: { security: { authentication } },
		[EApiRouteType.GET_LIST]: { generation: { isEnabled: false } },
		[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
		[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
	},
})
class OpenApiErrorIamItemController {
	@Inject(OpenApiErrorIamItemService)
	public readonly service!: OpenApiErrorIamItemService;
}

const ENTITIES: Array<new () => object> = [OpenApiErrorOwnerEntity, OpenApiErrorItemEntity, OpenApiErrorSecuredItemEntity, OpenApiErrorIamItemEntity];

const ITEMS: string = "/openapi-error-items";
const ITEM: string = "/openapi-error-items/{id}";
const SECURED_ITEMS: string = "/openapi-error-secured-items";
const SECURED_ITEM: string = "/openapi-error-secured-items/{id}";
const ITEM_SUMMARY: string = "/openapi-error-items/custom/summary";
const ITEM_GUARDED: string = "/openapi-error-items/custom/guarded";
const SECURED_EXPORT: string = "/openapi-error-secured-items/custom/export";
const SECURED_PING: string = "/openapi-error-secured-items/custom/ping";
const ITEM_THROTTLED: string = "/openapi-error-items/custom/throttled";
const SECURED_STATUS: string = "/openapi-error-secured-items/custom/status";
const PUBLIC_STATUS: string = "/openapi-error-public-items/custom/status";
const IAM_ITEMS: string = "/openapi-error-iam-items";
const IAM_ITEM: string = "/openapi-error-iam-items/{id}";

const OWNER_ID: string = "3c2b1a09-8f7e-4d6c-9b5a-4e3d2c1b0a9f";
const OWNER_MISSING_ID: string = "9d8c7b6a-5f4e-4d3c-8b2a-1f0e9d8c7b6a";
const SECURED_ID: string = "6f1c5a2e-3b7d-4c8e-9a0f-1d2e3f4a5b6c";
const SECURED_OTHER_ID: string = "5e4d3c2b-1a09-4f8e-8d7c-6b5a4f3e2d1c";
const SECURED_MISSING_ID: string = "0a9b8c7d-6e5f-4a3b-8c1d-2e3f4a5b6c7d";

const ADMIN_HEADERS: Record<string, string> = { "x-role": "admin", "x-user-id": "admin-1" };
const DENIED_HEADERS: Record<string, string> = { "x-role": "guest", "x-user-id": "guest-1" };
const BLOCKED_HEADERS: Record<string, string> = { ...ADMIN_HEADERS, "x-block": "true" };
const FORBIDDEN_HEADERS: Record<string, string> = { ...ADMIN_HEADERS, "x-forbid": "true" };
const GUARD_CRASH_HEADERS: Record<string, string> = { ...ADMIN_HEADERS, "x-guard-crash": "true" };
const AUTHENTICATION_CRASH_HEADERS: Record<string, string> = { "x-auth-crash": "true" };
const PRINCIPAL_CRASH_HEADERS: Record<string, string> = { "x-principal-crash": "true" };
const IAM_ALLOWED_HEADERS: Record<string, string> = { "x-user-id": IAM_ALLOWED_USER };
const IAM_DENIED_HEADERS: Record<string, string> = { "x-user-id": "iam-denied" };
const IAM_CRASH_HEADERS: Record<string, string> = { "x-user-id": IAM_CRASH_USER };

const LONG_ID: string = "x".repeat(65);
const EXPLODE: Record<string, string> = { "x-explode": "true" };
const ADMIN_EXPLODE: Record<string, string> = { ...ADMIN_HEADERS, ...EXPLODE };

/**
 * Builds one wire case of an operation.
 * @param {TSwaggerMethod} method - Operation method.
 * @param {string} path - Operation path as the document names it.
 * @param {HttpStatus} expectedStatus - Status the request must produce.
 * @param {string} name - Case name.
 * @param {string} url - Request URL.
 * @param {Pick<IWireCase, "body" | "contentType" | "headers" | "payload" | "precedingRequests">} [request] - Headers, payload or raw body, and the requests sent before it.
 * @returns {IWireCase} The wire case.
 */
function wireCase(method: TSwaggerMethod, path: string, expectedStatus: HttpStatus, name: string, url: string, request: Pick<IWireCase, "body" | "contentType" | "headers" | "payload" | "precedingRequests"> = {}): IWireCase {
	return { ...request, expectedStatus, method: method.toUpperCase() as IWireCase["method"], name: `${method} ${path} ${String(expectedStatus)} ${name}`, operation: { method, path }, url };
}

const ITEM_BODY: Record<string, unknown> = { code: "code-2", id: "item-2", name: "Item", owner: OWNER_ID, ownerId: OWNER_ID };

const WIRE_CASES: Array<IWireCase> = [
	wireCase("post", ITEMS, HttpStatus.BAD_REQUEST, "body DTO validation", ITEMS, { payload: { ...ITEM_BODY, name: "" } }),
	wireCase("post", ITEMS, HttpStatus.BAD_REQUEST, "relation reference shape", ITEMS, { payload: { ...ITEM_BODY, owner: { id: OWNER_ID } } }),
	wireCase("post", ITEMS, HttpStatus.BAD_REQUEST, "foreign key violation", ITEMS, { payload: { code: "code-2", id: "item-2", name: "Item", ownerId: OWNER_MISSING_ID } }),
	wireCase("post", ITEMS, HttpStatus.NOT_FOUND, "missing request relation", ITEMS, { payload: { ...ITEM_BODY, owner: OWNER_MISSING_ID, ownerId: OWNER_MISSING_ID } }),
	wireCase("post", ITEMS, HttpStatus.CONFLICT, "unique violation", ITEMS, { payload: { ...ITEM_BODY, code: "code-1" } }),
	wireCase("post", ITEMS, HttpStatus.UNPROCESSABLE_ENTITY, "request validator exception", ITEMS, { payload: { ...ITEM_BODY, name: "rejected" } }),
	wireCase("post", ITEMS, HttpStatus.INTERNAL_SERVER_ERROR, "unexpected failure", ITEMS, { headers: EXPLODE, payload: ITEM_BODY }),
	wireCase("get", ITEMS, HttpStatus.BAD_REQUEST, "typed filter", `${ITEMS}?limit=10&page=1&code[operator]=eq&code[value]=x`),
	wireCase("get", ITEMS, HttpStatus.INTERNAL_SERVER_ERROR, "unexpected failure", `${ITEMS}?limit=10&page=1`, { headers: EXPLODE }),
	wireCase("get", ITEM, HttpStatus.BAD_REQUEST, "path DTO validation", `${ITEMS}/${LONG_ID}`, { headers: ADMIN_HEADERS }),
	wireCase("get", ITEM, HttpStatus.NOT_FOUND, "row not found", `${ITEMS}/item-missing`, { headers: ADMIN_HEADERS }),
	wireCase("get", ITEM, HttpStatus.INTERNAL_SERVER_ERROR, "unexpected failure", `${ITEMS}/item-1`, { headers: ADMIN_EXPLODE }),
	wireCase("put", ITEM, HttpStatus.BAD_REQUEST, "body DTO validation", `${ITEMS}/item-1`, { payload: { code: "code-1", name: "", ownerId: OWNER_ID } }),
	wireCase("put", ITEM, HttpStatus.NOT_FOUND, "row not found", `${ITEMS}/item-missing`, { payload: { code: "code-9", name: "Changed", owner: OWNER_ID, ownerId: OWNER_ID } }),
	wireCase("put", ITEM, HttpStatus.CONFLICT, "unique violation", `${ITEMS}/item-1`, { payload: { code: "code-other", name: "Changed", owner: OWNER_ID, ownerId: OWNER_ID } }),
	wireCase("put", ITEM, HttpStatus.INTERNAL_SERVER_ERROR, "unexpected failure", `${ITEMS}/item-1`, { headers: EXPLODE, payload: { code: "code-9", name: "Changed", owner: OWNER_ID, ownerId: OWNER_ID } }),
	wireCase("patch", ITEM, HttpStatus.BAD_REQUEST, "body DTO validation", `${ITEMS}/item-1`, { payload: { name: "" } }),
	wireCase("patch", ITEM, HttpStatus.NOT_FOUND, "row not found", `${ITEMS}/item-missing`, { payload: { name: "Changed" } }),
	wireCase("patch", ITEM, HttpStatus.CONFLICT, "unique violation", `${ITEMS}/item-1`, { payload: { code: "code-other" } }),
	wireCase("patch", ITEM, HttpStatus.INTERNAL_SERVER_ERROR, "unexpected failure", `${ITEMS}/item-1`, { headers: EXPLODE, payload: { name: "Changed" } }),
	wireCase("delete", ITEM, HttpStatus.BAD_REQUEST, "path DTO validation", `${ITEMS}/${LONG_ID}`),
	wireCase("delete", ITEM, HttpStatus.NOT_FOUND, "row not found", `${ITEMS}/item-missing`),
	wireCase("delete", ITEM, HttpStatus.INTERNAL_SERVER_ERROR, "unexpected failure", `${ITEMS}/item-1`, { headers: EXPLODE }),
	wireCase("post", SECURED_ITEMS, HttpStatus.BAD_REQUEST, "body DTO validation", SECURED_ITEMS, { headers: ADMIN_HEADERS, payload: { id: SECURED_MISSING_ID, rank: "first" } }),
	wireCase("post", SECURED_ITEMS, HttpStatus.FORBIDDEN, "body outside the policy scope", SECURED_ITEMS, { headers: ADMIN_HEADERS, payload: { id: SECURED_MISSING_ID, rank: 100 } }),
	wireCase("post", SECURED_ITEMS, HttpStatus.CONFLICT, "unique violation", SECURED_ITEMS, { headers: ADMIN_HEADERS, payload: { id: SECURED_MISSING_ID, rank: 1 } }),
	wireCase("post", SECURED_ITEMS, HttpStatus.INTERNAL_SERVER_ERROR, "unexpected failure", SECURED_ITEMS, { headers: ADMIN_EXPLODE, payload: { id: SECURED_MISSING_ID, rank: 5 } }),
	wireCase("get", SECURED_ITEMS, HttpStatus.BAD_REQUEST, "cursor", `${SECURED_ITEMS}?limit=10&after=not-a-cursor`, { headers: ADMIN_HEADERS }),
	wireCase("get", SECURED_ITEMS, HttpStatus.INTERNAL_SERVER_ERROR, "unexpected failure", `${SECURED_ITEMS}?limit=10`, { headers: ADMIN_EXPLODE }),
	wireCase("get", SECURED_ITEM, HttpStatus.BAD_REQUEST, "path DTO validation", `${SECURED_ITEMS}/not-a-uuid`, { headers: ADMIN_HEADERS }),
	wireCase("get", SECURED_ITEM, HttpStatus.NOT_FOUND, "row not found", `${SECURED_ITEMS}/${SECURED_MISSING_ID}`, { headers: ADMIN_HEADERS }),
	wireCase("get", SECURED_ITEM, HttpStatus.INTERNAL_SERVER_ERROR, "unexpected failure", `${SECURED_ITEMS}/${SECURED_ID}`, { headers: ADMIN_EXPLODE }),
	wireCase("put", SECURED_ITEM, HttpStatus.BAD_REQUEST, "body DTO validation", `${SECURED_ITEMS}/${SECURED_ID}`, { headers: ADMIN_HEADERS, payload: { rank: "first" } }),
	wireCase("put", SECURED_ITEM, HttpStatus.NOT_FOUND, "row not found", `${SECURED_ITEMS}/${SECURED_MISSING_ID}`, { headers: ADMIN_HEADERS, payload: { rank: 7 } }),
	wireCase("put", SECURED_ITEM, HttpStatus.CONFLICT, "unique violation", `${SECURED_ITEMS}/${SECURED_ID}`, { headers: ADMIN_HEADERS, payload: { rank: 2 } }),
	wireCase("put", SECURED_ITEM, HttpStatus.INTERNAL_SERVER_ERROR, "unexpected failure", `${SECURED_ITEMS}/${SECURED_ID}`, { headers: ADMIN_EXPLODE, payload: { rank: 7 } }),
	wireCase("patch", SECURED_ITEM, HttpStatus.BAD_REQUEST, "body DTO validation", `${SECURED_ITEMS}/${SECURED_ID}`, { headers: ADMIN_HEADERS, payload: { rank: "first" } }),
	wireCase("patch", SECURED_ITEM, HttpStatus.NOT_FOUND, "row not found", `${SECURED_ITEMS}/${SECURED_MISSING_ID}`, { headers: ADMIN_HEADERS, payload: { rank: 7 } }),
	wireCase("patch", SECURED_ITEM, HttpStatus.CONFLICT, "unique violation", `${SECURED_ITEMS}/${SECURED_ID}`, { headers: ADMIN_HEADERS, payload: { rank: 2 } }),
	wireCase("patch", SECURED_ITEM, HttpStatus.INTERNAL_SERVER_ERROR, "unexpected failure", `${SECURED_ITEMS}/${SECURED_ID}`, { headers: ADMIN_EXPLODE, payload: { rank: 7 } }),
	wireCase("delete", SECURED_ITEM, HttpStatus.BAD_REQUEST, "path DTO validation", `${SECURED_ITEMS}/not-a-uuid`, { headers: ADMIN_HEADERS }),
	wireCase("delete", SECURED_ITEM, HttpStatus.NOT_FOUND, "row not found", `${SECURED_ITEMS}/${SECURED_MISSING_ID}`, { headers: ADMIN_HEADERS }),
	wireCase("delete", SECURED_ITEM, HttpStatus.INTERNAL_SERVER_ERROR, "unexpected failure", `${SECURED_ITEMS}/${SECURED_ID}`, { headers: ADMIN_EXPLODE }),
	wireCase("get", IAM_ITEM, HttpStatus.BAD_REQUEST, "path DTO validation", `${IAM_ITEMS}/${LONG_ID}`, { headers: IAM_ALLOWED_HEADERS }),
	wireCase("get", IAM_ITEM, HttpStatus.NOT_FOUND, "row not found", `${IAM_ITEMS}/iam-missing`, { headers: IAM_ALLOWED_HEADERS }),
	// Before the throttled route reaches its limit in the guard cases
	...[ITEM_SUMMARY, ITEM_THROTTLED, ITEM_GUARDED, PUBLIC_STATUS].map((path: string): IWireCase => wireCase("get", path, HttpStatus.INTERNAL_SERVER_ERROR, "custom route handler failure", path, { headers: EXPLODE })),
	wireCase("get", SECURED_EXPORT, HttpStatus.INTERNAL_SERVER_ERROR, "custom route handler failure", SECURED_EXPORT, { headers: ADMIN_EXPLODE }),
];

const SECURED_OPERATIONS: Array<{ method: TSwaggerMethod; path: string; payload?: Record<string, unknown>; url: string }> = [
	{ method: "post", path: SECURED_ITEMS, payload: { id: SECURED_MISSING_ID, rank: 5 }, url: SECURED_ITEMS },
	{ method: "get", path: SECURED_ITEMS, url: `${SECURED_ITEMS}?limit=10` },
	{ method: "get", path: SECURED_ITEM, url: `${SECURED_ITEMS}/${SECURED_ID}` },
	{ method: "put", path: SECURED_ITEM, payload: { rank: 7 }, url: `${SECURED_ITEMS}/${SECURED_ID}` },
	{ method: "patch", path: SECURED_ITEM, payload: { rank: 7 }, url: `${SECURED_ITEMS}/${SECURED_ID}` },
	{ method: "delete", path: SECURED_ITEM, url: `${SECURED_ITEMS}/${SECURED_ID}` },
];

// Guard rejections and guard failures skip CorrelationIDResponseBodyInterceptor, and a handler 403 passes through it
const GUARD_CASES: Array<IWireCase> = SECURED_OPERATIONS.flatMap((operation: (typeof SECURED_OPERATIONS)[number]): Array<IWireCase> => [
	wireCase(operation.method, operation.path, HttpStatus.UNAUTHORIZED, "authentication guard", operation.url, { payload: operation.payload }),
	wireCase(operation.method, operation.path, HttpStatus.FORBIDDEN, "authorization deny", operation.url, { headers: DENIED_HEADERS, payload: operation.payload }),
	wireCase(operation.method, operation.path, HttpStatus.FORBIDDEN, "guard returning false", operation.url, { headers: BLOCKED_HEADERS, payload: operation.payload }),
	wireCase(operation.method, operation.path, HttpStatus.FORBIDDEN, "handler refusal", operation.url, { headers: FORBIDDEN_HEADERS, payload: operation.payload }),
	wireCase(operation.method, operation.path, HttpStatus.INTERNAL_SERVER_ERROR, "execution guard failure", operation.url, { headers: GUARD_CRASH_HEADERS, payload: operation.payload }),
	wireCase(operation.method, operation.path, HttpStatus.INTERNAL_SERVER_ERROR, "authentication guard failure", operation.url, { headers: AUTHENTICATION_CRASH_HEADERS, payload: operation.payload }),
]).concat([
	wireCase("get", SECURED_EXPORT, HttpStatus.UNAUTHORIZED, "custom route authentication guard", SECURED_EXPORT),
	wireCase("get", SECURED_EXPORT, HttpStatus.FORBIDDEN, "custom route authorization deny", SECURED_EXPORT, { headers: DENIED_HEADERS }),
	wireCase("get", SECURED_PING, HttpStatus.FORBIDDEN, "ApiMethod route authorization deny", SECURED_PING, { headers: DENIED_HEADERS }),
	wireCase("get", SECURED_STATUS, HttpStatus.FORBIDDEN, "inherited custom route authorization deny", SECURED_STATUS, { headers: DENIED_HEADERS }),
	wireCase("get", ITEM, HttpStatus.UNAUTHORIZED, "authentication guard without authorization", `${ITEMS}/item-1`),
	wireCase("get", ITEM, HttpStatus.FORBIDDEN, "guard returning false without authorization", `${ITEMS}/item-1`, { headers: BLOCKED_HEADERS }),
	wireCase("get", ITEM, HttpStatus.INTERNAL_SERVER_ERROR, "execution guard failure without authorization", `${ITEMS}/item-1`, { headers: GUARD_CRASH_HEADERS }),
	wireCase("get", ITEM, HttpStatus.INTERNAL_SERVER_ERROR, "authentication guard failure without authorization", `${ITEMS}/item-1`, { headers: AUTHENTICATION_CRASH_HEADERS }),
	wireCase("get", ITEM_THROTTLED, HttpStatus.TOO_MANY_REQUESTS, "route throttling", ITEM_THROTTLED, { precedingRequests: 1 }),
	wireCase("get", ITEM_GUARDED, HttpStatus.UNAUTHORIZED, "custom route guard rejecting", ITEM_GUARDED, { headers: { ...ADMIN_HEADERS, "x-guard-reject": "true" } }),
	wireCase("get", ITEM_GUARDED, HttpStatus.FORBIDDEN, "custom route guard returning false", ITEM_GUARDED, { headers: BLOCKED_HEADERS }),
	wireCase("get", ITEM_GUARDED, HttpStatus.INTERNAL_SERVER_ERROR, "custom route guard failure", ITEM_GUARDED, { headers: GUARD_CRASH_HEADERS }),
	...[SECURED_PING, SECURED_STATUS].map((path: string): IWireCase => wireCase("get", path, HttpStatus.INTERNAL_SERVER_ERROR, "custom route authorization guard failure", path, { headers: PRINCIPAL_CRASH_HEADERS })),
	wireCase("get", IAM_ITEM, HttpStatus.UNAUTHORIZED, "IAM authentication guard", `${IAM_ITEMS}/iam-1`),
	wireCase("get", IAM_ITEM, HttpStatus.FORBIDDEN, "IAM deny", `${IAM_ITEMS}/iam-1`, { headers: IAM_DENIED_HEADERS }),
	wireCase("get", IAM_ITEM, HttpStatus.INTERNAL_SERVER_ERROR, "IAM document source failure", `${IAM_ITEMS}/iam-1`, { headers: IAM_CRASH_HEADERS }),
]);

const BODY_OPERATIONS: Array<{ method: TSwaggerMethod; path: string; url: string }> = [{ method: "post", path: ITEMS, url: ITEMS }, { method: "put", path: ITEM, url: `${ITEMS}/item-1` }, { method: "patch", path: ITEM, url: `${ITEMS}/item-1` }, { method: "delete", path: ITEM, url: `${ITEMS}/item-1` }, ...SECURED_OPERATIONS.filter((operation: (typeof SECURED_OPERATIONS)[number]): boolean => operation.method !== "get")];

// Over the Fastify default body limit of 1 MiB
const OVERSIZED_BODY: string = JSON.stringify({ name: "x".repeat(1_100_000) });

// The body parser answers before guards and interceptors run
const BODY_PARSER_CASES: Array<IWireCase> = BODY_OPERATIONS.flatMap((operation: (typeof BODY_OPERATIONS)[number]): Array<IWireCase> => [
	wireCase(operation.method, operation.path, HttpStatus.BAD_REQUEST, "malformed JSON body", operation.url, { body: "{bad", contentType: "application/json" }),
	wireCase(operation.method, operation.path, HttpStatus.PAYLOAD_TOO_LARGE, "body over the size limit", operation.url, { body: OVERSIZED_BODY, contentType: "application/json" }),
	wireCase(operation.method, operation.path, HttpStatus.UNSUPPORTED_MEDIA_TYPE, "unsupported media type", operation.url, { body: "<item/>", contentType: "text/xml" }),
]);

// The exception filter is optional, so every mode must keep the schema equal to the wire
const EXCEPTION_FILTER_MODES: Array<IExceptionFilterMode> = [
	{ createFilters: (): Array<ExceptionFilter> => [], name: "without an exception filter" },
	{ createFilters: (application: INestApplication): Array<ExceptionFilter> => [new CorrelationIDResponseBodyExceptionFilter(application.get(HttpAdapterHost))], name: "with CorrelationIDResponseBodyExceptionFilter" },
];

/**
 * Drops OpenAPI `nullable: false`, its default, which Ajv rejects next to a schema combinator.
 * @param {unknown} value - OpenAPI schema fragment.
 * @returns {unknown} The fragment without `nullable: false`.
 */
function withoutNonNullableFlags(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map((item: unknown): unknown => withoutNonNullableFlags(item));
	}

	if (value === null || typeof value !== "object") {
		return value;
	}

	return Object.fromEntries(
		Object.entries(value)
			.filter(([key, item]: [string, unknown]): boolean => key !== "nullable" || item !== false)
			.map(([key, item]: [string, unknown]): [string, unknown] => [key, withoutNonNullableFlags(item)]),
	);
}

describe.each(EXCEPTION_FILTER_MODES.map((mode: IExceptionFilterMode): [string, IExceptionFilterMode] => [mode.name, mode]))("generated route error responses %s (E2E)", (_modeName: string, mode: IExceptionFilterMode) => {
	let app: INestApplication;
	let container: StartedPostgreSqlContainer;
	let document: OpenAPIObject;
	let ajv: Ajv;
	let fastify: { inject: (options: { headers?: Record<string, string>; method: string; payload?: unknown; url: string }) => Promise<{ json: () => unknown; statusCode: number }> };

	const declaredStatuses = (path: string, method: TSwaggerMethod): Array<number> =>
		Object.keys(document.paths[path]?.[method]?.responses ?? {})
			.map(Number)
			.filter((status: number): boolean => status >= HttpStatus.BAD_REQUEST);

	const schemaReference = (path: string, method: TSwaggerMethod, status: number): string => {
		const response: { content?: Record<string, { schema?: { $ref?: string } }> } | undefined = document.paths[path]?.[method]?.responses[String(status)] as { content?: Record<string, { schema?: { $ref?: string } }> } | undefined;

		return response?.content?.["application/json"]?.schema?.$ref ?? "";
	};

	const validateWire = async (wireCase: IWireCase): Promise<{ body: unknown; errors: unknown }> => {
		const request = { headers: { ...wireCase.headers, ...(wireCase.contentType ? { "content-type": wireCase.contentType } : {}) }, method: wireCase.method, payload: wireCase.body ?? wireCase.payload, url: wireCase.url };

		for (let index: number = 0; index < (wireCase.precedingRequests ?? 0); index++) {
			await fastify.inject(request);
		}

		const response = await fastify.inject(request);

		expect(response.statusCode, `${wireCase.name}: ${JSON.stringify(response.json())}`).toBe(wireCase.expectedStatus);
		expect(declaredStatuses(wireCase.operation.path, wireCase.operation.method), wireCase.name).toContain(wireCase.expectedStatus);

		const validate = ajv.getSchema(`openapi${schemaReference(wireCase.operation.path, wireCase.operation.method, wireCase.expectedStatus)}`);

		expect(validate, wireCase.name).toBeDefined();
		const body: unknown = response.json();
		validate?.(body);

		return { body, errors: validate?.errors ?? null };
	};

	beforeAll(async () => {
		container = await new PostgreSqlContainer("postgres:17-alpine").start();
		const moduleReference = await Test.createTestingModule({
			controllers: [OpenApiErrorItemController, OpenApiErrorSecuredItemController, OpenApiErrorPublicItemController, OpenApiErrorIamItemController],
			imports: [
				TypeOrmModule.forRoot({ dropSchema: true, entities: ENTITIES, synchronize: true, type: "postgres", url: container.getConnectionUri() }),
				TypeOrmModule.forFeature(ENTITIES),
				ApiAuthorizationModule.forRoot({ iam: { attachmentSources: [iamAttachmentSource], documentSources: [iamDocumentSource] }, principalResolver }),
				ApiSubscriberModule,
				// Routes without throttling config never reach this limit
				ThrottlerModule.forRoot([{ limit: 10_000, ttl: 60_000 }]),
			],
			providers: [OpenApiErrorOwnerService, OpenApiErrorItemService, OpenApiErrorSecuredItemService, OpenApiErrorIamItemService, OpenApiErrorAuthenticationGuard, OpenApiErrorBlockGuard, OpenApiErrorSecuredItemPolicy, OpenApiErrorItemRouteSubscriber, OpenApiErrorSecuredItemRouteSubscriber, { provide: APP_GUARD, useClass: ThrottlerGuard }],
		}).compile();

		app = moduleReference.createNestApplication(new FastifyAdapter());
		app.useGlobalPipes(new ValidationPipe({ transform: true }));
		app.useGlobalInterceptors(new CorrelationIDResponseBodyInterceptor());
		app.useGlobalFilters(...mode.createFilters(app));
		await app.init();
		await app.getHttpAdapter().getInstance().ready();
		fastify = app.getHttpAdapter().getInstance();
		document = SwaggerModule.createDocument(app, new DocumentBuilder().build());

		ajv = new Ajv({ allErrors: true, discriminator: false, strict: false });
		addFormats(ajv);
		ajv.addFormat("int64", true);
		ajv.addFormat("string", true);
		ajv.addSchema({ components: withoutNonNullableFlags(document.components) }, "openapi");
	}, 120_000);

	beforeEach(async () => {
		const ownerService: OpenApiErrorOwnerService = app.get(OpenApiErrorOwnerService);
		const itemService: OpenApiErrorItemService = app.get(OpenApiErrorItemService);
		const securedService: OpenApiErrorSecuredItemService = app.get(OpenApiErrorSecuredItemService);
		const iamService: OpenApiErrorIamItemService = app.get(OpenApiErrorIamItemService);

		await itemService.repository.createQueryBuilder().delete().execute();
		await ownerService.repository.createQueryBuilder().delete().execute();
		await securedService.repository.createQueryBuilder().delete().execute();
		await iamService.repository.createQueryBuilder().delete().execute();
		await ownerService.repository.save({ id: OWNER_ID, name: "Owner" });
		await itemService.repository.save([
			{ code: "code-1", id: "item-1", name: "One" },
			{ code: "code-other", id: "item-other", name: "Other" },
		]);
		await securedService.repository.save([
			{ id: SECURED_ID, rank: 1 },
			{ id: SECURED_OTHER_ID, rank: 2 },
		]);
		await iamService.repository.save({ id: "iam-1", name: "One" });
	});

	afterAll(async () => {
		await app?.close();
		await container?.stop();
	});

	it("declares exactly the error statuses each configuration can return", () => {
		expect(declaredStatuses(ITEMS, "post")).toEqual([400, 404, 409, 413, 415, 422, 500]);
		expect(declaredStatuses(ITEMS, "get")).toEqual([400, 413, 415, 500]);
		expect(declaredStatuses(ITEM, "get")).toEqual([400, 401, 403, 404, 413, 415, 500]);
		expect(declaredStatuses(ITEM, "put")).toEqual([400, 404, 409, 413, 415, 500]);
		expect(declaredStatuses(ITEM, "patch")).toEqual([400, 404, 409, 413, 415, 500]);
		expect(declaredStatuses(ITEM, "delete")).toEqual([400, 404, 413, 415, 500]);

		expect(declaredStatuses(SECURED_ITEMS, "post")).toEqual([400, 401, 403, 409, 413, 415, 500]);
		expect(declaredStatuses(SECURED_ITEMS, "get")).toEqual([400, 401, 403, 413, 415, 500]);
		expect(declaredStatuses(SECURED_ITEM, "get")).toEqual([400, 401, 403, 404, 413, 415, 500]);
		expect(declaredStatuses(SECURED_ITEM, "put")).toEqual([400, 401, 403, 404, 409, 413, 415, 500]);
		expect(declaredStatuses(SECURED_ITEM, "patch")).toEqual([400, 401, 403, 404, 409, 413, 415, 500]);
		expect(declaredStatuses(SECURED_ITEM, "delete")).toEqual([400, 401, 403, 404, 413, 415, 500]);

		expect(declaredStatuses(IAM_ITEM, "get")).toEqual([400, 401, 403, 404, 413, 415, 500]);
	});

	it("declares the guard statuses of custom routes from their config", () => {
		expect(declaredStatuses(ITEM_SUMMARY, "get")).toEqual([400, 413, 415, 500]);
		expect(declaredStatuses(SECURED_EXPORT, "get")).toEqual([400, 401, 403, 413, 415, 500]);
		expect(declaredStatuses(SECURED_PING, "get")).toEqual([400, 403, 413, 415, 500]);
		expect(declaredStatuses(ITEM_THROTTLED, "get")).toEqual([400, 413, 415, 429, 500]);
		expect(declaredStatuses(ITEM_GUARDED, "get")).toEqual([400, 401, 403, 413, 415, 500]);
	});

	it("declares 403 on an inherited custom route only for the securable controller", async () => {
		expect(declaredStatuses(SECURED_STATUS, "get")).toEqual([400, 403, 413, 415, 500]);
		expect(declaredStatuses(PUBLIC_STATUS, "get")).toEqual([400, 413, 415, 500]);

		const response = await fastify.inject({ method: "GET", url: PUBLIC_STATUS });

		expect(response.statusCode).toBe(HttpStatus.OK);
		expect(response.json()).toEqual({ isShared: true });
		expect(document.paths[SECURED_EXPORT]?.get?.responses[String(HttpStatus.FORBIDDEN)]).toMatchObject({ description: "Forbidden" });
	});

	it("describes each error status with the exception DTO of that status", () => {
		for (const [path, item] of Object.entries(document.paths).filter(([path]: [string, unknown]): boolean => path.startsWith("/openapi-error-"))) {
			for (const method of ["delete", "get", "patch", "post", "put"] as const) {
				for (const status of item[method] ? declaredStatuses(path, method) : []) {
					expect(schemaReference(path, method, status), `${method} ${path} ${String(status)}`).toBe(`#/components/schemas/${DtoGenerateException(status).name}`);
				}
			}
		}
	});

	it.each(WIRE_CASES.map((wireCase: IWireCase): [string, IWireCase] => [wireCase.name, wireCase]))("matches the declared schema on the wire: %s", async (_name: string, wireCase: IWireCase) => {
		const { body, errors } = await validateWire(wireCase);

		expect(errors, JSON.stringify(body)).toBeNull();
	});

	it("reproduces every declared error status on the wire", () => {
		// Fastify never parses a GET body, so body-parser-statuses.e2e reproduces these GET statuses on Express
		const coveredOnExpress = (key: string): boolean => /^get .* (400|413|415)$/u.test(key);
		const covered: Array<string> = [...new Set([...WIRE_CASES, ...GUARD_CASES, ...BODY_PARSER_CASES].map((wireCase: IWireCase): string => `${wireCase.operation.method} ${wireCase.operation.path} ${String(wireCase.expectedStatus)}`))].filter((key: string): boolean => !coveredOnExpress(key)).sort();
		const declared: Array<string> = Object.entries(document.paths)
			.filter(([path]: [string, unknown]): boolean => path.startsWith("/openapi-error-"))
			.flatMap(([path, item]: [string, OpenAPIObject["paths"][string]]): Array<string> => (["delete", "get", "patch", "post", "put"] as const).filter((method: TSwaggerMethod): boolean => item[method] !== undefined).flatMap((method: TSwaggerMethod): Array<string> => declaredStatuses(path, method).map((status: number): string => `${method} ${path} ${String(status)}`)))
			.filter((key: string): boolean => !coveredOnExpress(key))
			.sort();

		expect(covered).toEqual(declared);
	});

	it.each(GUARD_CASES.map((wireCase: IWireCase): [string, IWireCase] => [wireCase.name, wireCase]))("matches the declared schema on a guard or handler refusal: %s", async (_name: string, wireCase: IWireCase) => {
		const { body, errors } = await validateWire(wireCase);

		expect(errors, JSON.stringify(body)).toBeNull();
	});

	it.each(BODY_PARSER_CASES.map((wireCase: IWireCase): [string, IWireCase] => [wireCase.name, wireCase]))("matches the declared schema on a body parser refusal: %s", async (_name: string, wireCase: IWireCase) => {
		const { body, errors } = await validateWire(wireCase);

		expect(errors, JSON.stringify(body)).toBeNull();
	});
});
