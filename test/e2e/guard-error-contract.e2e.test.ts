import "reflect-metadata";

import type { CanActivate, ExecutionContext, INestApplication, Provider } from "@nestjs/common";
import type { OpenAPIObject } from "@nestjs/swagger";
import type { Repository } from "typeorm";

import { ForbiddenException, HttpStatus, Inject, Injectable, Module, UnauthorizedException } from "@nestjs/common";
import { APP_GUARD, HttpAdapterHost } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { ApiForbiddenResponse, DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Test } from "@nestjs/testing";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { InjectRepository, TypeOrmModule } from "@nestjs/typeorm";
import { Column, Entity, PrimaryColumn } from "typeorm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { ApiAuthorizationModule, ApiAuthorizationPolicy, ApiAuthorizationPolicyBase, ApiController, ApiControllerSecurable, ApiPropertyDescribe, ApiService, ApiServiceBase, ApiSubscriberModule, CorrelationIDResponseBodyExceptionFilter, CorrelationIDResponseBodyInterceptor, EApiAuthenticationType, EApiAuthorizationMode, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteGuardStage, EApiRouteType } from "../../src/index";

import { DtoGenerateException } from "../../src/utility/dto/generate/exception.utility";

import { TestAuthGuard } from "./app/auth-guard";
import { e2eHookPermissionSource } from "./app/hook-permission-source";
import { e2eAuthorizationPrincipalResolver } from "./app/principal-resolver";

const ROW_ID: string = "row-1";
const CLIENT_CORRELATION_ID: string = "client-correlation-id";
const ADMIN_HEADERS: Record<string, string> = { "x-authenticated": "true", "x-role": "admin", "x-user-id": "guard-contract-user" };

@Entity("guard_contract_entities")
class E2eGuardContractEntity {
	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "guardContractId",
		exampleValue: ROW_ID,
		format: EApiPropertyStringType.STRING,
		maxLength: 64,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "guardContractName",
		exampleValue: "Name",
		format: EApiPropertyStringType.STRING,
		maxLength: 100,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public name!: string;
}

@Injectable()
@ApiService({ entity: E2eGuardContractEntity })
class E2eGuardContractService extends ApiServiceBase<E2eGuardContractEntity> {
	@InjectRepository(E2eGuardContractEntity)
	public readonly repository!: Repository<E2eGuardContractEntity>;
}

@Injectable()
@ApiAuthorizationPolicy({ entity: E2eGuardContractEntity })
class E2eGuardContractPolicySubscriber extends ApiAuthorizationPolicyBase<E2eGuardContractEntity> {
	public onBeforeGet() {
		return this.allowForRoles(["admin"]);
	}
}

@Injectable()
class E2eRejectingAuthGuard extends TestAuthGuard {
	public override async canActivate(context: ExecutionContext): Promise<boolean> {
		const request: { headers: Record<string, unknown> } = this.getRequest(context);

		if (request.headers["x-authenticated"] !== "true") {
			throw new UnauthorizedException();
		}

		return await super.canActivate(context);
	}
}

class E2eForbiddingGuard implements CanActivate {
	public canActivate(): boolean {
		throw new ForbiddenException("CONSUMER_GUARD_FORBIDDEN");
	}
}

class E2eFalseGuard implements CanActivate {
	public canActivate(): boolean {
		return false;
	}
}

class E2eFailingGuard implements CanActivate {
	public canActivate(): boolean {
		throw new Error("GUARD_INTERNAL_SENTINEL");
	}
}

const authentication = { guard: E2eRejectingAuthGuard, type: EApiAuthenticationType.USER };
const securedAuthorization = { defaultMode: EApiAuthorizationMode.HOOKS };

@ApiControllerSecurable()
@ApiController<E2eGuardContractEntity>({
	authorization: securedAuthorization,
	entity: E2eGuardContractEntity,
	name: "E2eGuardContractPlain",
	path: "guard-contract/plain",
	routes: { [EApiRouteType.GET]: { generation: { decorators: [ApiForbiddenResponse({ description: "Forbidden", type: DtoGenerateException(HttpStatus.FORBIDDEN) })] }, security: { authentication } } },
})
class E2eGuardContractPlainController {
	@Inject(E2eGuardContractService)
	public readonly service!: E2eGuardContractService;
}

@ApiControllerSecurable()
@ApiController<E2eGuardContractEntity>({
	authorization: securedAuthorization,
	entity: E2eGuardContractEntity,
	name: "E2eGuardContractThrottledBeforeAuthentication",
	path: "guard-contract/throttled-before-authentication",
	routes: { [EApiRouteType.GET]: { execution: { guards: [{ guard: ThrottlerGuard, stage: EApiRouteGuardStage.BEFORE_AUTHENTICATION }] }, security: { authentication } } },
})
class E2eGuardContractThrottledBeforeAuthenticationController {
	@Inject(E2eGuardContractService)
	public readonly service!: E2eGuardContractService;
}

@ApiControllerSecurable()
@ApiController<E2eGuardContractEntity>({
	authorization: securedAuthorization,
	entity: E2eGuardContractEntity,
	name: "E2eGuardContractThrottledAfterAuthentication",
	path: "guard-contract/throttled-after-authentication",
	routes: { [EApiRouteType.GET]: { execution: { guards: [{ guard: ThrottlerGuard, stage: EApiRouteGuardStage.AFTER_AUTHENTICATION }] }, security: { authentication } } },
})
class E2eGuardContractThrottledAfterAuthenticationController {
	@Inject(E2eGuardContractService)
	public readonly service!: E2eGuardContractService;
}

@ApiControllerSecurable()
@ApiController<E2eGuardContractEntity>({
	authorization: securedAuthorization,
	entity: E2eGuardContractEntity,
	name: "E2eGuardContractThrottledAfterAuthorization",
	path: "guard-contract/throttled-after-authorization",
	routes: { [EApiRouteType.GET]: { execution: { guards: [{ guard: ThrottlerGuard, stage: EApiRouteGuardStage.AFTER_AUTHORIZATION }] }, security: { authentication } } },
})
class E2eGuardContractThrottledAfterAuthorizationController {
	@Inject(E2eGuardContractService)
	public readonly service!: E2eGuardContractService;
}

@ApiController<E2eGuardContractEntity>({
	entity: E2eGuardContractEntity,
	name: "E2eGuardContractConsumerForbidden",
	path: "guard-contract/consumer-forbidden",
	routes: { [EApiRouteType.GET]: { execution: { guards: [E2eForbiddingGuard] } } },
})
class E2eGuardContractConsumerForbiddenController {
	@Inject(E2eGuardContractService)
	public readonly service!: E2eGuardContractService;
}

@ApiController<E2eGuardContractEntity>({
	entity: E2eGuardContractEntity,
	name: "E2eGuardContractConsumerFalse",
	path: "guard-contract/consumer-false",
	routes: { [EApiRouteType.GET]: { execution: { guards: [E2eFalseGuard] } } },
})
class E2eGuardContractConsumerFalseController {
	@Inject(E2eGuardContractService)
	public readonly service!: E2eGuardContractService;
}

@ApiController<E2eGuardContractEntity>({
	entity: E2eGuardContractEntity,
	name: "E2eGuardContractConsumerFailing",
	path: "guard-contract/consumer-failing",
	routes: { [EApiRouteType.GET]: { execution: { guards: [E2eFailingGuard] } } },
})
class E2eGuardContractConsumerFailingController {
	@Inject(E2eGuardContractService)
	public readonly service!: E2eGuardContractService;
}

@Module({
	controllers: [E2eGuardContractPlainController, E2eGuardContractThrottledBeforeAuthenticationController, E2eGuardContractThrottledAfterAuthenticationController, E2eGuardContractThrottledAfterAuthorizationController, E2eGuardContractConsumerForbiddenController, E2eGuardContractConsumerFalseController, E2eGuardContractConsumerFailingController],
	imports: [TypeOrmModule.forRoot({ database: ":memory:", dropSchema: true, entities: [E2eGuardContractEntity], logging: false, synchronize: true, type: "better-sqlite3" }), TypeOrmModule.forFeature([E2eGuardContractEntity]), ThrottlerModule.forRoot({ throttlers: [{ limit: 1, ttl: 60_000 }] }), ApiAuthorizationModule.forRoot({ hookPermissionSources: [e2eHookPermissionSource], principalResolver: e2eAuthorizationPrincipalResolver }), ApiSubscriberModule],
	providers: [E2eGuardContractService, E2eGuardContractPolicySubscriber, E2eRejectingAuthGuard],
})
class E2eGuardContractModule {}

interface IInjectResponse {
	headers: Record<string, unknown>;
	json: () => Record<string, unknown>;
	statusCode: number;
}

interface IFastifyInjector {
	inject: (options: { headers?: Record<string, string>; method: string; url: string }) => Promise<IInjectResponse>;
	ready: () => Promise<void>;
}

/**
 * Boots the generated routes behind the global filter and interceptor, as the documented setup does.
 * @param {Array<Provider>} [providers] - Extra root providers.
 * @returns {Promise<INestApplication>} Initialized application.
 */
async function createApplication(providers: Array<Provider> = []): Promise<INestApplication> {
	const moduleReference = await Test.createTestingModule({ imports: [E2eGuardContractModule], providers }).compile();
	const application: INestApplication = moduleReference.createNestApplication(new FastifyAdapter());

	application.useGlobalFilters(new CorrelationIDResponseBodyExceptionFilter(application.get(HttpAdapterHost)));
	application.useGlobalInterceptors(new CorrelationIDResponseBodyInterceptor());
	await application.init();
	await (application.getHttpAdapter().getInstance() as IFastifyInjector).ready();

	await moduleReference.get(E2eGuardContractService).repository.save({ id: ROW_ID, name: "Name" });

	return application;
}

/**
 * Asserts the correlation contract every error response carries.
 * @param {IInjectResponse} response - Injected response.
 * @param {number} status - Expected status.
 * @param {string} [correlationId] - Expected correlation ID, when the client sent one.
 * @returns {void}
 */
function expectErrorContract(response: IInjectResponse, status: number, correlationId?: string, hasError: boolean = true): void {
	const body: Record<string, unknown> = response.json();

	expect(response.statusCode).toBe(status);
	expect(body.statusCode).toBe(status);
	expect(body.error).toEqual(hasError ? expect.any(String) : undefined);
	expect(body.message).toEqual(expect.anything());
	expect(body.timestamp).toEqual(expect.any(Number));
	expect(body.correlationID).toEqual(expect.any(String));
	expect(response.headers["x-correlation-id"]).toBe(body.correlationID);

	if (correlationId) {
		expect(body.correlationID).toBe(correlationId);
	}
}

interface ISchemaProperty {
	enum?: Array<unknown>;
	items?: ISchemaProperty;
	maxLength?: number;
	minLength?: number;
	oneOf?: Array<ISchemaProperty>;
	pattern?: string;
	type?: string;
}

interface IObjectSchema {
	properties: Record<string, ISchemaProperty>;
	required: Array<string>;
}

/**
 * Resolves the documented error schema of a response on the generated GET route.
 * @param {OpenAPIObject} document - OpenAPI document of the application.
 * @param {number} status - Documented response status.
 * @returns {IObjectSchema} The referenced component schema.
 */
function getErrorSchema(document: OpenAPIObject, status: number): IObjectSchema {
	const response: { content?: Record<string, { schema?: { $ref?: string } }> } | undefined = document.paths["/guard-contract/plain/{id}"]?.get?.responses[String(status)] as { content?: Record<string, { schema?: { $ref?: string } }> } | undefined;
	const reference: string = response?.content?.["application/json"]?.schema?.$ref ?? "";

	return document.components?.schemas?.[reference.replace("#/components/schemas/", "")] as IObjectSchema;
}

/**
 * Checks a value against an OpenAPI property schema: its type, `oneOf` alternatives, array items, enum, length and pattern.
 * @param {unknown} value - Wire value.
 * @param {ISchemaProperty} property - Documented property schema.
 * @returns {boolean} Whether the value matches.
 */
function matchesSchema(value: unknown, property: ISchemaProperty): boolean {
	if (property.oneOf) {
		return property.oneOf.some((alternative: ISchemaProperty) => matchesSchema(value, alternative));
	}

	const isTypeMatching: boolean = property.type === "array" ? Array.isArray(value) && value.every((item: unknown) => matchesSchema(item, property.items ?? {})) : property.type === "integer" ? Number.isInteger(value) : typeof value === property.type;
	const isEnumMatching: boolean = !property.enum || property.enum.includes(value);
	const isStringMatching: boolean = typeof value !== "string" || (value.length >= (property.minLength ?? 0) && value.length <= (property.maxLength ?? Number.MAX_SAFE_INTEGER) && new RegExp(property.pattern ?? "").test(value));

	return isTypeMatching && isEnumMatching && isStringMatching;
}

/**
 * Asserts that a wire body has every required field of its documented schema and nothing the schema does not declare, each value matching its declared schema.
 * @param {Record<string, unknown>} body - Response body.
 * @param {IObjectSchema} schema - Documented schema.
 * @returns {void}
 */
function expectBodyMatchesSchema(body: Record<string, unknown>, schema: IObjectSchema): void {
	expect(Object.keys(body).filter((key: string) => !(key in schema.properties))).toEqual([]);
	expect(schema.required.filter((key: string) => !(key in body))).toEqual([]);

	for (const [key, value] of Object.entries(body)) {
		expect(matchesSchema(value, schema.properties[key] ?? {}), key).toBe(true);
	}
}

describe("Guard error response contract (E2E)", () => {
	let application: INestApplication;
	let globalThrottlerApplication: INestApplication;

	const request = async (target: INestApplication, path: string, headers: Record<string, string> = ADMIN_HEADERS): Promise<IInjectResponse> => await (target.getHttpAdapter().getInstance() as IFastifyInjector).inject({ headers, method: "GET", url: `/guard-contract/${path}/${ROW_ID}` });

	beforeAll(async () => {
		vi.spyOn(console, "error").mockImplementation(() => undefined);
		application = await createApplication();
		globalThrottlerApplication = await createApplication([{ provide: APP_GUARD, useClass: ThrottlerGuard }]);
	});

	afterAll(async () => {
		await application.close();
		await globalThrottlerApplication.close();
		vi.restoreAllMocks();
	});

	it.each([["throttled-before-authentication"], ["throttled-after-authentication"], ["throttled-after-authorization"]])("answers a real ThrottlerGuard 429 on the %s stage with the contract", async (path: string) => {
		expect((await request(application, path)).statusCode).toBe(HttpStatus.OK);

		const response: IInjectResponse = await request(application, path);

		expectErrorContract(response, HttpStatus.TOO_MANY_REQUESTS);
		expect(response.json().error).toBe("Too Many Requests");
		expect(response.headers["retry-after"]).toEqual(expect.any(String));
	});

	it("answers a global ThrottlerGuard 429 with the contract and the client correlation ID", async () => {
		expect((await request(globalThrottlerApplication, "plain")).statusCode).toBe(HttpStatus.OK);

		const response: IInjectResponse = await request(globalThrottlerApplication, "plain", { ...ADMIN_HEADERS, "x-correlation-id": CLIENT_CORRELATION_ID });

		expectErrorContract(response, HttpStatus.TOO_MANY_REQUESTS, CLIENT_CORRELATION_ID);
		expect(response.json().error).toBe("Too Many Requests");
		expect(response.headers["retry-after"]).toEqual(expect.any(String));
	});

	it("answers a 401 from the consumer authentication guard with the contract", async () => {
		const response: IInjectResponse = await request(application, "plain", { "x-correlation-id": CLIENT_CORRELATION_ID });

		expectErrorContract(response, HttpStatus.UNAUTHORIZED, CLIENT_CORRELATION_ID, false);
		expect(response.json().message).toBe("Unauthorized");
	});

	it("answers a 403 from ApiAuthorizationGuard with the contract", async () => {
		const response: IInjectResponse = await request(application, "plain", { "x-authenticated": "true", "x-role": "viewer", "x-user-id": "guard-contract-user" });

		expectErrorContract(response, HttpStatus.FORBIDDEN, undefined, false);
		expect(response.json().message).toBe("Forbidden");
	});

	it("answers a 403 thrown by a consumer guard with the contract", async () => {
		const response: IInjectResponse = await request(application, "consumer-forbidden");

		expectErrorContract(response, HttpStatus.FORBIDDEN);
		expect(response.json().message).toBe("CONSUMER_GUARD_FORBIDDEN");
	});

	it("answers a consumer guard returning false with the contract", async () => {
		expectErrorContract(await request(application, "consumer-false"), HttpStatus.FORBIDDEN);
	});

	it("answers an unexpected guard failure with the contract and keeps it out of the response", async () => {
		const response: IInjectResponse = await request(application, "consumer-failing");

		expectErrorContract(response, HttpStatus.INTERNAL_SERVER_ERROR);
		expect(response.json().message).toBe("Internal server error");
		expect(JSON.stringify(response.json())).not.toContain("GUARD_INTERNAL_SENTINEL");
	});

	it("documents every field the guard 401 and 403 bodies carry, and only those", async () => {
		const document: OpenAPIObject = SwaggerModule.createDocument(application, new DocumentBuilder().build());
		const unauthorizedSchema: IObjectSchema = getErrorSchema(document, HttpStatus.UNAUTHORIZED);
		const forbiddenSchema: IObjectSchema = getErrorSchema(document, HttpStatus.FORBIDDEN);
		const unauthorized: Record<string, unknown> = (await request(application, "plain", {})).json();
		const forbidden: Record<string, unknown> = (await request(application, "plain", { "x-authenticated": "true", "x-role": "viewer", "x-user-id": "guard-contract-user" })).json();

		expect(unauthorizedSchema.required.toSorted()).toEqual(["correlationID", "error", "message", "statusCode", "timestamp"]);
		expect(forbiddenSchema.required.toSorted()).toEqual(["correlationID", "error", "message", "statusCode", "timestamp"]);
		expect(unauthorized).toEqual({ correlationID: expect.any(String), message: "Unauthorized", statusCode: HttpStatus.UNAUTHORIZED, timestamp: expect.any(Number) });
		expect(forbidden).toEqual({ correlationID: expect.any(String), message: "Forbidden", statusCode: HttpStatus.FORBIDDEN, timestamp: expect.any(Number) });
		// These exceptions have no arguments, so Nest built no `error`; the DTO still requires it until the exception schemas follow the wire
		expectBodyMatchesSchema({ ...unauthorized, error: "Unauthorized" }, unauthorizedSchema);
		expectBodyMatchesSchema({ ...forbidden, error: "Forbidden" }, forbiddenSchema);
	});

	it("documents message and error as free text, including the messages Nest and the throttler answer", () => {
		const schema: IObjectSchema = getErrorSchema(SwaggerModule.createDocument(application, new DocumentBuilder().build()), HttpStatus.UNAUTHORIZED);

		for (const message of ["ThrottlerException: Too Many Requests", "Cannot GET /nope", "Body is not valid JSON but content-type is set to 'application/json'", ["email must be a string", "name must be longer than or equal to 1 characters"], ""]) {
			expect(matchesSchema(message, schema.properties.message ?? {}), JSON.stringify(message)).toBe(true);
		}

		expect(matchesSchema("Network Authentication Required", schema.properties.error ?? {})).toBe(true);
		expect(matchesSchema(42, schema.properties.message ?? {})).toBe(false);
	});

	it("keeps a successful response free of error fields", async () => {
		const response: IInjectResponse = await request(application, "plain");

		expect(response.statusCode).toBe(HttpStatus.OK);
		expect(response.json()).toEqual({ id: ROW_ID, name: "Name" });
	});
});
