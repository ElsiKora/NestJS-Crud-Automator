import "reflect-metadata";

import type { CanActivate, ExecutionContext, INestApplication, Provider } from "@nestjs/common";
import type { Repository } from "typeorm";

import { ForbiddenException, HttpStatus, Inject, Injectable, Module, UnauthorizedException } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { InjectRepository, TypeOrmModule } from "@nestjs/typeorm";
import { Column, Entity, PrimaryColumn } from "typeorm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { ApiAuthorizationModule, ApiAuthorizationPolicy, ApiAuthorizationPolicyBase, ApiController, ApiControllerSecurable, ApiPropertyDescribe, ApiService, ApiServiceBase, ApiSubscriberModule, CorrelationIDResponseBodyInterceptor, EApiAuthenticationType, EApiAuthorizationMode, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteGuardStage, EApiRouteType } from "../../src/index";

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
	routes: { [EApiRouteType.GET]: { security: { authentication } } },
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
	imports: [TypeOrmModule.forRoot({ database: ":memory:", dropSchema: true, entities: [E2eGuardContractEntity], logging: false, synchronize: true, type: "sqlite" }), TypeOrmModule.forFeature([E2eGuardContractEntity]), ThrottlerModule.forRoot({ throttlers: [{ limit: 1, ttl: 60_000 }] }), ApiAuthorizationModule.forRoot({ hookPermissionSources: [e2eHookPermissionSource], principalResolver: e2eAuthorizationPrincipalResolver }), ApiSubscriberModule],
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
 * Boots the generated routes behind the global interceptor, as the documented setup does.
 * @param {Array<Provider>} [providers] - Extra root providers.
 * @returns {Promise<INestApplication>} Initialized application.
 */
async function createApplication(providers: Array<Provider> = []): Promise<INestApplication> {
	const moduleReference = await Test.createTestingModule({ imports: [E2eGuardContractModule], providers }).compile();
	const application: INestApplication = moduleReference.createNestApplication(new FastifyAdapter());

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
function expectErrorContract(response: IInjectResponse, status: number, correlationId?: string): void {
	const body: Record<string, unknown> = response.json();

	expect(response.statusCode).toBe(status);
	expect(body.statusCode).toBe(status);
	expect(body.message).toEqual(expect.anything());
	expect(body.timestamp).toEqual(expect.any(Number));
	expect(body.correlationID).toEqual(expect.any(String));
	expect(response.headers["x-correlation-id"]).toBe(body.correlationID);

	if (correlationId) {
		expect(body.correlationID).toBe(correlationId);
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

		expectErrorContract(response, HttpStatus.UNAUTHORIZED, CLIENT_CORRELATION_ID);
		expect(response.json().error).toBe("Unauthorized");
	});

	it("answers a 403 from ApiAuthorizationGuard with the contract", async () => {
		const response: IInjectResponse = await request(application, "plain", { "x-authenticated": "true", "x-role": "viewer", "x-user-id": "guard-contract-user" });

		expectErrorContract(response, HttpStatus.FORBIDDEN);
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

	it("keeps a successful response free of error fields", async () => {
		const response: IInjectResponse = await request(application, "plain");

		expect(response.statusCode).toBe(HttpStatus.OK);
		expect(response.json()).toEqual({ id: ROW_ID, name: "Name" });
	});
});
