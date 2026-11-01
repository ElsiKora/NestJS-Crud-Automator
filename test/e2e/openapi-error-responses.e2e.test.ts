import "reflect-metadata";

import type { CanActivate, ExceptionFilter, ExecutionContext, INestApplication } from "@nestjs/common";
import type { OpenAPIObject } from "@nestjs/swagger";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { Repository } from "typeorm";

import { ForbiddenException, HttpStatus, Inject, Injectable, UnauthorizedException, UnprocessableEntityException, ValidationPipe } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Test } from "@nestjs/testing";
import { InjectRepository, TypeOrmModule } from "@nestjs/typeorm";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { Ajv } from "ajv";
import addFormats from "ajv-formats";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
	ApiAuthorizationModule,
	ApiAuthorizationPolicy,
	ApiAuthorizationPolicyBase,
	ApiController,
	ApiControllerObservable,
	ApiControllerSecurable,
	ApiPropertyDescribe,
	ApiRouteSubscriber,
	ApiRouteSubscriberBase,
	ApiService,
	ApiServiceBase,
	ApiSubscriberModule,
	CorrelationIDResponseBodyInterceptor,
	DtoGenerateException,
	EApiAuthenticationType,
	EApiAuthorizationMode,
	EApiControllerGetListQueryPaginationMode,
	EApiControllerGetListQueryUnlistedFields,
	EApiControllerRelationReferenceShape,
	EApiControllerRequestTarget,
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
	filters: Array<ExceptionFilter>;
	name: string;
}

interface IWireCase {
	expectedStatus: HttpStatus;
	headers?: Record<string, string>;
	method: "DELETE" | "GET" | "PATCH" | "POST" | "PUT";
	name: string;
	operation: { method: TSwaggerMethod; path: string };
	payload?: Record<string, unknown>;
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
class OpenApiErrorAuthenticationGuard implements CanActivate {
	public canActivate(context: ExecutionContext): boolean {
		const request: { headers: Record<string, string | undefined>; user?: unknown } = context.switchToHttp().getRequest();
		const userId: string | undefined = request.headers["x-user-id"];

		if (!userId) {
			throw new UnauthorizedException();
		}

		request.user = { id: userId, roles: request.headers["x-role"] ? [request.headers["x-role"]] : [] };

		return true;
	}
}

/**
 * Refuses every request that carries the `x-block` header by returning false, which Nest answers with its own 403.
 */
@Injectable()
class OpenApiErrorBlockGuard implements CanActivate {
	public canActivate(context: ExecutionContext): boolean {
		const request: { headers: Record<string, string | undefined> } = context.switchToHttp().getRequest();

		return !request.headers["x-block"];
	}
}

@Injectable()
@ApiAuthorizationPolicy({ entity: OpenApiErrorSecuredItemEntity })
class OpenApiErrorSecuredItemPolicy extends ApiAuthorizationPolicyBase<OpenApiErrorSecuredItemEntity> {
	public onBeforeCreate() {
		return this.allowForRoles(["admin"]);
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
class OpenApiErrorSecuredItemController {
	@Inject(OpenApiErrorSecuredItemService)
	public readonly service!: OpenApiErrorSecuredItemService;
}

const ENTITIES: Array<new () => object> = [OpenApiErrorOwnerEntity, OpenApiErrorItemEntity, OpenApiErrorSecuredItemEntity];

const ITEMS: string = "/openapi-error-items";
const ITEM: string = "/openapi-error-items/{id}";
const SECURED_ITEMS: string = "/openapi-error-secured-items";
const SECURED_ITEM: string = "/openapi-error-secured-items/{id}";

const OWNER_ID: string = "3c2b1a09-8f7e-4d6c-9b5a-4e3d2c1b0a9f";
const OWNER_MISSING_ID: string = "9d8c7b6a-5f4e-4d3c-8b2a-1f0e9d8c7b6a";
const SECURED_ID: string = "6f1c5a2e-3b7d-4c8e-9a0f-1d2e3f4a5b6c";
const SECURED_OTHER_ID: string = "5e4d3c2b-1a09-4f8e-8d7c-6b5a4f3e2d1c";
const SECURED_MISSING_ID: string = "0a9b8c7d-6e5f-4a3b-8c1d-2e3f4a5b6c7d";

const ADMIN_HEADERS: Record<string, string> = { "x-role": "admin", "x-user-id": "admin-1" };
const DENIED_HEADERS: Record<string, string> = { "x-role": "guest", "x-user-id": "guest-1" };
const BLOCKED_HEADERS: Record<string, string> = { ...ADMIN_HEADERS, "x-block": "true" };
const FORBIDDEN_HEADERS: Record<string, string> = { ...ADMIN_HEADERS, "x-forbid": "true" };

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
 * @param {Pick<IWireCase, "headers" | "payload">} [request] - Headers and payload.
 * @returns {IWireCase} The wire case.
 */
function wireCase(method: TSwaggerMethod, path: string, expectedStatus: HttpStatus, name: string, url: string, request: Pick<IWireCase, "headers" | "payload"> = {}): IWireCase {
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
	wireCase("get", ITEM, HttpStatus.BAD_REQUEST, "path DTO validation", `${ITEMS}/${LONG_ID}`),
	wireCase("get", ITEM, HttpStatus.NOT_FOUND, "row not found", `${ITEMS}/item-missing`),
	wireCase("get", ITEM, HttpStatus.INTERNAL_SERVER_ERROR, "unexpected failure", `${ITEMS}/item-1`, { headers: EXPLODE }),
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
];

const SECURED_OPERATIONS: Array<{ method: TSwaggerMethod; path: string; payload?: Record<string, unknown>; url: string }> = [
	{ method: "post", path: SECURED_ITEMS, payload: { id: SECURED_MISSING_ID, rank: 5 }, url: SECURED_ITEMS },
	{ method: "get", path: SECURED_ITEMS, url: `${SECURED_ITEMS}?limit=10` },
	{ method: "get", path: SECURED_ITEM, url: `${SECURED_ITEMS}/${SECURED_ID}` },
	{ method: "put", path: SECURED_ITEM, payload: { rank: 7 }, url: `${SECURED_ITEMS}/${SECURED_ID}` },
	{ method: "patch", path: SECURED_ITEM, payload: { rank: 7 }, url: `${SECURED_ITEMS}/${SECURED_ID}` },
	{ method: "delete", path: SECURED_ITEM, url: `${SECURED_ITEMS}/${SECURED_ID}` },
];

// Guard rejections skip CorrelationIDResponseBodyInterceptor, and a handler 403 passes through it
const GUARD_CASES: Array<IWireCase> = SECURED_OPERATIONS.flatMap((operation: (typeof SECURED_OPERATIONS)[number]): Array<IWireCase> => [
	wireCase(operation.method, operation.path, HttpStatus.UNAUTHORIZED, "authentication guard", operation.url, { payload: operation.payload }),
	wireCase(operation.method, operation.path, HttpStatus.FORBIDDEN, "authorization deny", operation.url, { headers: DENIED_HEADERS, payload: operation.payload }),
	wireCase(operation.method, operation.path, HttpStatus.FORBIDDEN, "guard returning false", operation.url, { headers: BLOCKED_HEADERS, payload: operation.payload }),
	wireCase(operation.method, operation.path, HttpStatus.FORBIDDEN, "handler refusal", operation.url, { headers: FORBIDDEN_HEADERS, payload: operation.payload }),
]);

// The exception filter is optional, so every mode must keep the schema equal to the wire
const EXCEPTION_FILTER_MODES: Array<IExceptionFilterMode> = [{ filters: [], name: "without an exception filter" }];

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
		const response = await fastify.inject({ headers: wireCase.headers, method: wireCase.method, payload: wireCase.payload, url: wireCase.url });

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
			controllers: [OpenApiErrorItemController, OpenApiErrorSecuredItemController],
			imports: [TypeOrmModule.forRoot({ dropSchema: true, entities: ENTITIES, synchronize: true, type: "postgres", url: container.getConnectionUri() }), TypeOrmModule.forFeature(ENTITIES), ApiAuthorizationModule.forRoot({}), ApiSubscriberModule],
			providers: [OpenApiErrorOwnerService, OpenApiErrorItemService, OpenApiErrorSecuredItemService, OpenApiErrorAuthenticationGuard, OpenApiErrorBlockGuard, OpenApiErrorSecuredItemPolicy, OpenApiErrorItemRouteSubscriber, OpenApiErrorSecuredItemRouteSubscriber],
		}).compile();

		app = moduleReference.createNestApplication(new FastifyAdapter());
		app.useGlobalPipes(new ValidationPipe({ transform: true }));
		app.useGlobalInterceptors(new CorrelationIDResponseBodyInterceptor());
		app.useGlobalFilters(...mode.filters);
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

		await itemService.repository.createQueryBuilder().delete().execute();
		await ownerService.repository.createQueryBuilder().delete().execute();
		await securedService.repository.createQueryBuilder().delete().execute();
		await ownerService.repository.save({ id: OWNER_ID, name: "Owner" });
		await itemService.repository.save([
			{ code: "code-1", id: "item-1", name: "One" },
			{ code: "code-other", id: "item-other", name: "Other" },
		]);
		await securedService.repository.save([
			{ id: SECURED_ID, rank: 1 },
			{ id: SECURED_OTHER_ID, rank: 2 },
		]);
	});

	afterAll(async () => {
		await app?.close();
		await container?.stop();
	});

	it("declares exactly the error statuses each configuration can return", () => {
		expect(declaredStatuses(ITEMS, "post")).toEqual([400, 404, 409, 422, 500]);
		expect(declaredStatuses(ITEMS, "get")).toEqual([400, 500]);
		expect(declaredStatuses(ITEM, "get")).toEqual([400, 404, 500]);
		expect(declaredStatuses(ITEM, "put")).toEqual([400, 404, 409, 500]);
		expect(declaredStatuses(ITEM, "patch")).toEqual([400, 404, 409, 500]);
		expect(declaredStatuses(ITEM, "delete")).toEqual([400, 404, 500]);

		expect(declaredStatuses(SECURED_ITEMS, "post")).toEqual([400, 401, 403, 409, 500]);
		expect(declaredStatuses(SECURED_ITEMS, "get")).toEqual([400, 401, 403, 500]);
		expect(declaredStatuses(SECURED_ITEM, "get")).toEqual([400, 401, 403, 404, 500]);
		expect(declaredStatuses(SECURED_ITEM, "put")).toEqual([400, 401, 403, 404, 409, 500]);
		expect(declaredStatuses(SECURED_ITEM, "patch")).toEqual([400, 401, 403, 404, 409, 500]);
		expect(declaredStatuses(SECURED_ITEM, "delete")).toEqual([400, 401, 403, 404, 500]);
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
		const covered: Array<string> = [...new Set([...WIRE_CASES, ...GUARD_CASES].map((wireCase: IWireCase): string => `${wireCase.operation.method} ${wireCase.operation.path} ${String(wireCase.expectedStatus)}`))].sort();
		const declared: Array<string> = Object.entries(document.paths)
			.filter(([path]: [string, unknown]): boolean => path.startsWith("/openapi-error-"))
			.flatMap(([path, item]: [string, OpenAPIObject["paths"][string]]): Array<string> => (["delete", "get", "patch", "post", "put"] as const).filter((method: TSwaggerMethod): boolean => item[method] !== undefined).flatMap((method: TSwaggerMethod): Array<string> => declaredStatuses(path, method).map((status: number): string => `${method} ${path} ${String(status)}`)))
			.sort();

		expect(covered).toEqual(declared);
	});

	it.each(GUARD_CASES.map((wireCase: IWireCase): [string, IWireCase] => [wireCase.name, wireCase]))("matches the declared schema on a guard or handler refusal: %s", async (_name: string, wireCase: IWireCase) => {
		const { body, errors } = await validateWire(wireCase);

		expect(errors, JSON.stringify(body)).toBeNull();
	});
});
