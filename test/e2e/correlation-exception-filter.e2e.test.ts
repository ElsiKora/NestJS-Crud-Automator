import "reflect-metadata";

import type { ArgumentsHost, CanActivate, ExceptionFilter, ExecutionContext, INestApplication, MiddlewareConsumer, NestMiddleware, NestModule, Provider, Type } from "@nestjs/common";
import type { CustomTransportStrategy, MessageHandler } from "@nestjs/microservices";
import type { FastifyReply } from "fastify";
import type { Socket } from "socket.io-client";

import { BadRequestException, Body, Catch, ConsoleLogger, Controller, ForbiddenException, Get, HttpException, HttpStatus, Module, Post, Res, UnauthorizedException, UseFilters, UseGuards, UseInterceptors } from "@nestjs/common";
import { APP_FILTER, APP_GUARD, HttpAdapterHost } from "@nestjs/core";
import { MessagePattern, RpcException, Server } from "@nestjs/microservices";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { IoAdapter } from "@nestjs/platform-socket.io";
import { Test } from "@nestjs/testing";
import { ThrottlerException, ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { SubscribeMessage, WebSocketGateway, WsException } from "@nestjs/websockets";
import { isObservable, lastValueFrom } from "rxjs";
import { io } from "socket.io-client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CorrelationIDNormalizeException, CorrelationIDResponseBodyExceptionFilter, CorrelationIDResponseBodyInterceptor, FormatErrorEvidenceForLog } from "../../src/index";

const SECRET_SENTINEL: string = "SECRET_GUARD_SENTINEL";
const CLIENT_CORRELATION_ID: string = "client-correlation-id";
const FROZEN_NOW: number = 1_700_000_000_000;

const guardFailure: Error = new Error(SECRET_SENTINEL);
const unknownFailures: Record<string, unknown> = { error: new Error(SECRET_SENTINEL), value: SECRET_SENTINEL };

const HTTP_ERRORS: Record<string, unknown> = {
	"client-error": Object.assign(new Error("Body is too large"), { statusCode: HttpStatus.PAYLOAD_TOO_LARGE }),
	"empty-message": { message: "", statusCode: HttpStatus.BAD_REQUEST },
	"exposed-client-error": { expose: true, message: "PUBLIC_CLIENT_MESSAGE", statusCode: HttpStatus.NOT_FOUND },
	"exposed-server-error": { expose: true, message: "EXPOSED_SERVER_MESSAGE", statusCode: HttpStatus.SERVICE_UNAVAILABLE },
	"exposed-unknown-status": { expose: true, message: "EXPOSED_UNKNOWN_MESSAGE", statusCode: 599 },
	"hidden-client-error": { expose: false, message: SECRET_SENTINEL, statusCode: HttpStatus.BAD_REQUEST },
	"hidden-server-error": { expose: false, message: SECRET_SENTINEL, statusCode: HttpStatus.SERVICE_UNAVAILABLE },
	"status-1000": { expose: true, message: SECRET_SENTINEL, statusCode: 1000 },
	"status-200": { expose: true, message: SECRET_SENTINEL, statusCode: HttpStatus.OK },
	"status-302": { expose: true, message: SECRET_SENTINEL, statusCode: HttpStatus.FOUND },
	"string-status": { expose: true, message: SECRET_SENTINEL, statusCode: "404" },
	"upstream-not-found": { message: `No such customer: ${SECRET_SENTINEL}`, statusCode: HttpStatus.NOT_FOUND },
	"zero-status": { message: SECRET_SENTINEL, statusCode: 0 },
};

const HTTP_ERROR_ANSWERS: Record<string, [number, string, string]> = {
	"client-error": [HttpStatus.PAYLOAD_TOO_LARGE, "Payload Too Large", "Payload Too Large"],
	"empty-message": [HttpStatus.BAD_REQUEST, "Bad Request", "Bad Request"],
	"exposed-client-error": [HttpStatus.NOT_FOUND, "PUBLIC_CLIENT_MESSAGE", "Not Found"],
	"exposed-server-error": [HttpStatus.SERVICE_UNAVAILABLE, "EXPOSED_SERVER_MESSAGE", "Service Unavailable"],
	"exposed-unknown-status": [599, "EXPOSED_UNKNOWN_MESSAGE", "Error"],
	"hidden-client-error": [HttpStatus.BAD_REQUEST, "Bad Request", "Bad Request"],
	"hidden-server-error": [HttpStatus.SERVICE_UNAVAILABLE, "Service Unavailable", "Service Unavailable"],
	"status-1000": [HttpStatus.INTERNAL_SERVER_ERROR, "Internal server error", "Internal Server Error"],
	"status-200": [HttpStatus.INTERNAL_SERVER_ERROR, "Internal server error", "Internal Server Error"],
	"status-302": [HttpStatus.INTERNAL_SERVER_ERROR, "Internal server error", "Internal Server Error"],
	"string-status": [HttpStatus.INTERNAL_SERVER_ERROR, "Internal server error", "Internal Server Error"],
	"upstream-not-found": [HttpStatus.NOT_FOUND, "Not Found", "Not Found"],
	"zero-status": [HttpStatus.INTERNAL_SERVER_ERROR, "Internal server error", "Internal Server Error"],
};

class E2eThrowingGuard implements CanActivate {
	public constructor(private readonly failure: unknown) {}

	public canActivate(): boolean {
		throw this.failure;
	}
}

class E2eHttpErrorGuard implements CanActivate {
	public canActivate(context: ExecutionContext): boolean {
		const name: string = context.switchToHttp().getRequest<{ params: { name: string } }>().params.name;

		throw HTTP_ERRORS[name];
	}
}

class E2eSendingGuard implements CanActivate {
	public canActivate(context: ExecutionContext): boolean {
		void context.switchToHttp().getResponse<FastifyReply>().status(HttpStatus.ACCEPTED).send({ sentBy: "guard" });

		throw new ForbiddenException("AFTER_SEND");
	}
}

class E2eUnauthorizedMiddleware implements NestMiddleware {
	public use(): void {
		throw new UnauthorizedException("MIDDLEWARE_UNAUTHORIZED");
	}
}

class E2eForbiddenMiddleware implements NestMiddleware {
	public use(): void {
		throw new ForbiddenException("MIDDLEWARE_FORBIDDEN");
	}
}

@Controller("contract")
class E2eContractController {
	@UseGuards(new E2eThrowingGuard(new ForbiddenException("GUARD_FORBIDDEN")))
	@Get("guard-object")
	public guardObject(): void {}

	@UseGuards(new E2eThrowingGuard(new HttpException("GUARD_STRING", HttpStatus.FORBIDDEN)))
	@Get("guard-string")
	public guardString(): void {}

	@UseGuards(new E2eThrowingGuard(new ForbiddenException({ correlationID: "consumer-owned", message: "CONSUMER_BODY", statusCode: HttpStatus.FORBIDDEN })))
	@Get("guard-consumer-body")
	public guardConsumerBody(): void {}

	@UseGuards(new E2eThrowingGuard(new ThrottlerException()))
	@Get("guard-throttled")
	public guardThrottled(): void {}

	@UseGuards(new E2eThrowingGuard(guardFailure))
	@Get("guard-unknown")
	public guardUnknown(): void {}

	@UseGuards(new E2eSendingGuard())
	@Get("guard-sent")
	public guardSent(): void {}

	@UseGuards(new E2eHttpErrorGuard())
	@Get("guard-http-error/:name")
	public guardHttpError(): void {}

	@Get("handler-http-error/:name")
	public handlerHttpError(@Res({ passthrough: true }) reply: FastifyReply): void {
		throw HTTP_ERRORS[(reply.request.params as { name: string }).name];
	}

	@Get("handler-object")
	public handlerObject(): void {
		throw new BadRequestException("HANDLER_OBJECT");
	}

	@Get("handler-string")
	public handlerString(): void {
		throw new HttpException("HANDLER_STRING", HttpStatus.CONFLICT);
	}

	@Get("handler-consumer-body")
	public handlerConsumerBody(): void {
		throw new BadRequestException({ correlationID: "consumer-owned", message: "CONSUMER_BODY" });
	}

	@Get("handler-throttled")
	public handlerThrottled(@Res({ passthrough: true }) reply: FastifyReply): void {
		void reply.header("retry-after", "7");

		throw new ThrottlerException();
	}

	@Get("handler-unknown")
	public handlerUnknown(): void {
		throw unknownFailures.error;
	}

	@Get("handler-value")
	public handlerValue(): void {
		throw unknownFailures.value;
	}

	@Get("middleware-unauthorized")
	public middlewareUnauthorized(): void {}

	@Get("middleware-forbidden")
	public middlewareForbidden(): void {}

	@Post("body")
	public body(@Body() body: unknown): unknown {
		return body;
	}
}

@Module({ controllers: [E2eContractController] })
class E2eContractModule implements NestModule {
	public configure(consumer: MiddlewareConsumer): void {
		consumer.apply(E2eUnauthorizedMiddleware).forRoutes("contract/middleware-unauthorized");
		consumer.apply(E2eForbiddenMiddleware).forRoutes("contract/middleware-forbidden");
	}
}

@Catch()
class E2eConsumerRawFilter implements ExceptionFilter {
	public readonly seen: Array<unknown> = [];

	public catch(exception: unknown, host: ArgumentsHost): void {
		this.seen.push(exception);
		const status: number = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

		void host.switchToHttp().getResponse<FastifyReply>().status(status).send({ handledBy: "consumer", statusCode: status });
	}
}

// The consumer filter from the error handling guide, with recording added
@Catch()
class E2eConsumerNormalizingFilter implements ExceptionFilter {
	public static readonly causes: Array<unknown> = [];

	public static readonly seen: Array<unknown> = [];

	public constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

	public catch(exception: unknown, host: ArgumentsHost): void {
		if (host.getType() !== "http") {
			return;
		}

		E2eConsumerNormalizingFilter.seen.push(exception);
		const { httpAdapter } = this.httpAdapterHost;
		const response: { headersSent?: boolean } = host.getArgByIndex(1);
		const normalized: HttpException = CorrelationIDNormalizeException(exception, host, this.httpAdapterHost);

		E2eConsumerNormalizingFilter.causes.push(normalized.cause);

		if (!(response.headersSent ?? httpAdapter.isHeadersSent(response))) {
			httpAdapter.reply(response, { ...(normalized.getResponse() as object), handledBy: "consumer" }, normalized.getStatus());
		}
	}
}

interface IInjectResponse {
	headers: Record<string, unknown>;
	json: () => Record<string, unknown>;
	payload: string;
	statusCode: number;
}

interface IInjectOptions {
	headers?: Record<string, string>;
	method?: string;
	payload?: string;
	url: string;
}

interface IFastifyInjector {
	inject: (options: IInjectOptions) => Promise<IInjectResponse>;
	ready: () => Promise<void>;
}

type TFilterFactory = (application: INestApplication) => ExceptionFilter;

interface IFastifyHooks {
	addHook: (name: "onRequest", hook: (request: { url: string }, reply: unknown, done: (error?: unknown) => void) => void) => void;
}

interface IApplicationOptions {
	filters?: Array<TFilterFactory>;
	hasInterceptor?: boolean;
	hasRequestHooks?: boolean;
	isListening?: boolean;
	providers?: Array<Provider>;
}

const applications: Array<INestApplication> = [];

/**
 * Boots the contract module on Fastify.
 * @param {IApplicationOptions} [options] - Global filters, interceptor, Fastify onRequest hooks, providers, and whether to listen on a socket.
 * @returns {Promise<INestApplication>} Initialized application.
 */
async function createApplication(options: IApplicationOptions = {}): Promise<INestApplication> {
	const moduleReference = await Test.createTestingModule({ imports: [E2eContractModule], providers: options.providers ?? [] }).compile();
	const application: INestApplication = moduleReference.createNestApplication(new FastifyAdapter(), { logger: false });

	if (options.hasInterceptor ?? true) {
		application.useGlobalInterceptors(new CorrelationIDResponseBodyInterceptor());
	}

	application.useGlobalFilters(...(options.filters ?? []).map((factory: TFilterFactory) => factory(application)));
	applications.push(application);

	if (options.hasRequestHooks) {
		(application.getHttpAdapter().getInstance() as IFastifyHooks).addHook("onRequest", (request: { url: string }, _reply: unknown, done: (error?: unknown) => void) => {
			if (request.url === "/contract/hook-forbidden") {
				done(new ForbiddenException("HOOK_FORBIDDEN"));
			} else if (request.url === "/contract/hook-error") {
				done(new Error(SECRET_SENTINEL));
			} else {
				done();
			}
		});
	}

	if (options.isListening) {
		await application.listen(0, "127.0.0.1");
	} else {
		await application.init();
		await (application.getHttpAdapter().getInstance() as IFastifyInjector).ready();
	}

	return application;
}

const inject = async (application: INestApplication, options: IInjectOptions): Promise<IInjectResponse> => await (application.getHttpAdapter().getInstance() as IFastifyInjector).inject({ method: "GET", ...options });

/**
 * Sends a request over a real socket.
 * @param {INestApplication} application - A listening application.
 * @param {string} path - Request path.
 * @param {Record<string, string>} [headers] - Request headers.
 * @returns {Promise<{ body: string; headers: Headers; status: number }>} Status, headers, and raw body.
 */
async function fetchOverSocket(application: INestApplication, path: string, headers: Record<string, string> = {}): Promise<{ body: string; headers: Headers; status: number }> {
	const { port }: { port: number } = application.getHttpServer().address() as { port: number };
	const response: Response = await fetch(`http://127.0.0.1:${String(port)}${path}`, { headers });

	return { body: await response.text(), headers: response.headers, status: response.status };
}

/**
 * Reads the logger context of a recorded ConsoleLogger call.
 * @param {ReturnType<typeof vi.spyOn>} spy - The ConsoleLogger method spy.
 * @param {number} index - The call index.
 * @returns {string | undefined} The logger context.
 */
function logContext(spy: ReturnType<typeof vi.spyOn>, index: number): string | undefined {
	return (spy.mock.contexts[index] as { context?: string } | undefined)?.context;
}

const fullFilter: TFilterFactory = (application: INestApplication): ExceptionFilter => new CorrelationIDResponseBodyExceptionFilter(application.get(HttpAdapterHost));

const consumerNormalizingFilter: TFilterFactory = (application: INestApplication): ExceptionFilter => new E2eConsumerNormalizingFilter(application.get(HttpAdapterHost));

describe("CorrelationIDResponseBodyExceptionFilter (E2E)", () => {
	let errorLog: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		E2eConsumerNormalizingFilter.causes.length = 0;
		E2eConsumerNormalizingFilter.seen.length = 0;
		errorLog = vi.spyOn(ConsoleLogger.prototype, "error").mockImplementation(() => undefined);
		vi.spyOn(ConsoleLogger.prototype, "warn").mockImplementation(() => undefined);
	});

	afterEach(async () => {
		vi.restoreAllMocks();
		await Promise.all(applications.splice(0).map(async (application: INestApplication) => await application.close()));
	});

	describe("without the filter", () => {
		it.each([
			["guard-object", HttpStatus.FORBIDDEN, '{"message":"GUARD_FORBIDDEN","error":"Forbidden","statusCode":403}'],
			["guard-string", HttpStatus.FORBIDDEN, '{"statusCode":403,"message":"GUARD_STRING"}'],
			["guard-throttled", HttpStatus.TOO_MANY_REQUESTS, '{"statusCode":429,"message":"ThrottlerException: Too Many Requests"}'],
			["guard-unknown", HttpStatus.INTERNAL_SERVER_ERROR, '{"statusCode":500,"message":"Internal server error"}'],
			["middleware-unauthorized", HttpStatus.UNAUTHORIZED, '{"message":"MIDDLEWARE_UNAUTHORIZED","error":"Unauthorized","statusCode":401}'],
		])("leaves the %s response byte-identical", async (path: string, status: number, payload: string) => {
			const application: INestApplication = await createApplication();
			const response: IInjectResponse = await inject(application, { url: `/contract/${path}` });

			expect(response.statusCode).toBe(status);
			expect(response.payload).toBe(payload);
			expect(response.headers).not.toHaveProperty("x-correlation-id");
		});

		it("leaves the not-found and malformed body responses byte-identical", async () => {
			const application: INestApplication = await createApplication();

			expect((await inject(application, { url: "/contract/missing" })).payload).toBe('{"message":"Cannot GET /contract/missing","error":"Not Found","statusCode":404}');
			expect((await inject(application, { headers: { "content-type": "application/json" }, method: "POST", payload: "{broken", url: "/contract/body" })).statusCode).toBe(HttpStatus.BAD_REQUEST);
		});
	});

	describe("with the interceptor and the filter", () => {
		it.each([["handler-object"], ["handler-string"], ["handler-consumer-body"], ["handler-throttled"], ["handler-unknown"], ["handler-value"]])("leaves the %s response byte-identical", async (path: string) => {
			vi.spyOn(Date, "now").mockReturnValue(FROZEN_NOW);
			const interceptorOnly: INestApplication = await createApplication();
			const withFilter: INestApplication = await createApplication({ filters: [fullFilter] });
			const options: IInjectOptions = { headers: { "x-correlation-id": CLIENT_CORRELATION_ID }, url: `/contract/${path}` };

			const expected: IInjectResponse = await inject(interceptorOnly, options);
			const actual: IInjectResponse = await inject(withFilter, options);

			expect(actual.statusCode).toBe(expected.statusCode);
			expect(actual.payload).toBe(expected.payload);
			expect(actual.headers).toEqual(expected.headers);
			expect(actual.json().correlationID).toBe(CLIENT_CORRELATION_ID);
		});

		it("keeps retry-after on a throttled handler response", async () => {
			const application: INestApplication = await createApplication({ filters: [fullFilter] });

			expect((await inject(application, { url: "/contract/handler-throttled" })).headers["retry-after"]).toBe("7");
		});

		it("logs an unknown handler failure once, under the interceptor", async () => {
			const application: INestApplication = await createApplication({ filters: [fullFilter] });

			await inject(application, { url: "/contract/handler-unknown" });

			expect(errorLog).toHaveBeenCalledTimes(1);
			expect(logContext(errorLog, 0)).toBe("NestJS-Crud-Automator/CorrelationIDResponseBodyInterceptor");
		});
	});

	describe("for failures outside the handler chain", () => {
		it("does not trust a correlationID the consumer put in the body", async () => {
			const application: INestApplication = await createApplication({ filters: [fullFilter] });
			const response: IInjectResponse = await inject(application, { headers: { "x-correlation-id": CLIENT_CORRELATION_ID }, url: "/contract/guard-consumer-body" });

			expect(response.json()).toEqual({ correlationID: CLIENT_CORRELATION_ID, error: "Forbidden", message: "CONSUMER_BODY", statusCode: HttpStatus.FORBIDDEN, timestamp: expect.any(Number) });
			expect(response.headers["x-correlation-id"]).toBe(CLIENT_CORRELATION_ID);
		});

		it("completes a string response with error and statusCode", async () => {
			vi.spyOn(Date, "now").mockReturnValue(FROZEN_NOW);
			const application: INestApplication = await createApplication({ filters: [fullFilter] });
			const response: IInjectResponse = await inject(application, { headers: { "x-correlation-id": CLIENT_CORRELATION_ID }, url: "/contract/guard-string" });

			expect(response.statusCode).toBe(HttpStatus.FORBIDDEN);
			expect(response.payload).toBe(JSON.stringify({ message: "GUARD_STRING", error: "Forbidden", statusCode: HttpStatus.FORBIDDEN, correlationID: CLIENT_CORRELATION_ID, timestamp: FROZEN_NOW }));
		});

		it("answers an unknown guard failure with the sanitized body and one bounded log under the filter", async () => {
			const application: INestApplication = await createApplication({ filters: [fullFilter] });
			const response: IInjectResponse = await inject(application, { url: "/contract/guard-unknown" });

			expect(response.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
			expect(response.json()).toEqual({ correlationID: expect.any(String), error: "Internal Server Error", message: "Internal server error", statusCode: HttpStatus.INTERNAL_SERVER_ERROR, timestamp: expect.any(Number) });
			expect(errorLog).toHaveBeenCalledTimes(1);
			expect(String(errorLog.mock.calls[0]?.[0])).toContain(FormatErrorEvidenceForLog(guardFailure));
			expect(logContext(errorLog, 0)).toBe("NestJS-Crud-Automator/CorrelationIDResponseBodyExceptionFilter");
			expect(JSON.stringify(errorLog.mock.calls)).not.toContain(SECRET_SENTINEL);
			expect(response.payload).not.toContain(SECRET_SENTINEL);
		});

		it("does not write twice when the guard already sent the response", async () => {
			const application: INestApplication = await createApplication({ filters: [fullFilter] });
			const response: IInjectResponse = await inject(application, { url: "/contract/guard-sent" });

			expect(response.statusCode).toBe(HttpStatus.ACCEPTED);
			expect(response.json()).toEqual({ sentBy: "guard" });
		});

		it("answers an unmatched route with the contract", async () => {
			const application: INestApplication = await createApplication({ filters: [fullFilter] });
			const response: IInjectResponse = await inject(application, { url: "/contract/missing" });

			expect(response.statusCode).toBe(HttpStatus.NOT_FOUND);
			expect(response.json()).toEqual({ correlationID: response.headers["x-correlation-id"], error: "Not Found", message: "Cannot GET /contract/missing", statusCode: HttpStatus.NOT_FOUND, timestamp: expect.any(Number) });
		});

		it("answers a malformed JSON body with the contract and the same status and message", async () => {
			const bare: INestApplication = await createApplication();
			const application: INestApplication = await createApplication({ filters: [fullFilter] });
			const options: IInjectOptions = { headers: { "content-type": "application/json" }, method: "POST", payload: "{broken", url: "/contract/body" };
			const before: IInjectResponse = await inject(bare, options);
			const response: IInjectResponse = await inject(application, options);

			expect(before.json()).toEqual({ message: expect.any(String), statusCode: HttpStatus.BAD_REQUEST });
			expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
			// Nest wraps the Fastify error in an HttpException with a string response, which the rule completes with error and statusCode
			expect(response.json()).toEqual({ correlationID: response.headers["x-correlation-id"], error: "Bad Request", message: before.json().message, statusCode: HttpStatus.BAD_REQUEST, timestamp: expect.any(Number) });
			expect(errorLog).not.toHaveBeenCalled();
		});

		it.each<[string, Record<string, string>, string, number, string, string]>([
			["a body that is too large", { "content-type": "application/json" }, JSON.stringify("x".repeat(1_048_577)), HttpStatus.PAYLOAD_TOO_LARGE, "Request body is too large", "Payload Too Large"],
			["an unsupported media type", { "content-type": "application/x-unknown" }, "data", HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Unsupported Media Type", "Unsupported Media Type"],
		])("answers %s with the contract and the status Fastify gives", async (_name: string, headers: Record<string, string>, payload: string, status: number, message: string, errorText: string) => {
			const bare: INestApplication = await createApplication();
			const application: INestApplication = await createApplication({ filters: [fullFilter] });
			const options: IInjectOptions = { headers, method: "POST", payload, url: "/contract/body" };
			const response: IInjectResponse = await inject(application, options);

			expect((await inject(bare, options)).json()).toEqual({ message, statusCode: status });
			expect(response.statusCode).toBe(status);
			expect(response.json()).toEqual({ correlationID: response.headers["x-correlation-id"], error: errorText, message, statusCode: status, timestamp: expect.any(Number) });
			expect(errorLog).not.toHaveBeenCalled();
		});

		it("answers an HttpException from a Fastify onRequest hook with the contract", async () => {
			const application: INestApplication = await createApplication({ filters: [fullFilter], hasRequestHooks: true });
			const response: IInjectResponse = await inject(application, { headers: { "x-correlation-id": CLIENT_CORRELATION_ID }, url: "/contract/hook-forbidden" });

			expect(response.statusCode).toBe(HttpStatus.FORBIDDEN);
			expect(response.json()).toEqual({ correlationID: CLIENT_CORRELATION_ID, error: "Forbidden", message: "HOOK_FORBIDDEN", statusCode: HttpStatus.FORBIDDEN, timestamp: expect.any(Number) });
			expect(response.headers["x-correlation-id"]).toBe(CLIENT_CORRELATION_ID);
		});

		it("answers an unknown failure from a Fastify onRequest hook with the sanitized body and one bounded log", async () => {
			const application: INestApplication = await createApplication({ filters: [fullFilter], hasRequestHooks: true });
			const response: IInjectResponse = await inject(application, { url: "/contract/hook-error" });

			expect(response.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
			expect(response.json()).toEqual({ correlationID: response.headers["x-correlation-id"], error: "Internal Server Error", message: "Internal server error", statusCode: HttpStatus.INTERNAL_SERVER_ERROR, timestamp: expect.any(Number) });
			expect(errorLog).toHaveBeenCalledTimes(1);
			expect(JSON.stringify(errorLog.mock.calls)).not.toContain(SECRET_SENTINEL);
			expect(response.payload).not.toContain(SECRET_SENTINEL);
		});

		it("leaves a malformed URL to Fastify, which answers before Nest", async () => {
			const bare: INestApplication = await createApplication();
			const application: INestApplication = await createApplication({ filters: [fullFilter] });
			const before: IInjectResponse = await inject(bare, { url: "/contract/%E0%A4%A" });
			const response: IInjectResponse = await inject(application, { url: "/contract/%E0%A4%A" });

			expect(response.statusCode).toBe(before.statusCode);
			expect(response.payload).toBe(before.payload);
			expect(response.headers).not.toHaveProperty("x-correlation-id");
		});

		it("replaces a blank client header with a generated ID", async () => {
			const application: INestApplication = await createApplication({ filters: [fullFilter] });
			const response: IInjectResponse = await inject(application, { headers: { "x-correlation-id": "   " }, url: "/contract/guard-object" });

			expect(response.json().correlationID).toMatch(/^[0-9a-f-]{36}$/u);
			expect(response.headers["x-correlation-id"]).toBe(response.json().correlationID);
		});

		it("trims a client header like the interceptor does", async () => {
			const application: INestApplication = await createApplication({ filters: [fullFilter] });
			const guard: IInjectResponse = await inject(application, { headers: { "x-correlation-id": ` ${CLIENT_CORRELATION_ID} ` }, url: "/contract/guard-object" });
			const handler: IInjectResponse = await inject(application, { headers: { "x-correlation-id": ` ${CLIENT_CORRELATION_ID} ` }, url: "/contract/handler-object" });

			expect(guard.json().correlationID).toBe(CLIENT_CORRELATION_ID);
			expect(handler.json().correlationID).toBe(CLIENT_CORRELATION_ID);
		});
	});

	describe("for middleware failures over a real socket", () => {
		it.each([
			["middleware-unauthorized", HttpStatus.UNAUTHORIZED, "MIDDLEWARE_UNAUTHORIZED", "Unauthorized"],
			["middleware-forbidden", HttpStatus.FORBIDDEN, "MIDDLEWARE_FORBIDDEN", "Forbidden"],
		])("answers the %s failure with the contract", async (path: string, status: number, message: string, error: string) => {
			const application: INestApplication = await createApplication({ filters: [fullFilter], isListening: true });
			const response: { body: string; headers: Headers; status: number } = await fetchOverSocket(application, `/contract/${path}`, { "x-correlation-id": CLIENT_CORRELATION_ID });

			expect(response.status).toBe(status);
			expect(response.headers.get("x-correlation-id")).toBe(CLIENT_CORRELATION_ID);
			expect(response.headers.get("content-type")).toContain("application/json");
			expect(JSON.parse(response.body)).toEqual({ correlationID: CLIENT_CORRELATION_ID, error, message, statusCode: status, timestamp: expect.any(Number) });
			expect(errorLog).not.toHaveBeenCalled();
		});

		it("generates an ID for a middleware failure without a client header", async () => {
			const application: INestApplication = await createApplication({ filters: [fullFilter], isListening: true });
			const response: { body: string; headers: Headers; status: number } = await fetchOverSocket(application, "/contract/middleware-unauthorized");

			expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
			expect((JSON.parse(response.body) as { correlationID: string }).correlationID).toBe(response.headers.get("x-correlation-id"));
		});

		it("answers a middleware failure through the documented consumer filter", async () => {
			const application: INestApplication = await createApplication({ filters: [consumerNormalizingFilter], isListening: true });
			const response: { body: string; headers: Headers; status: number } = await fetchOverSocket(application, "/contract/middleware-forbidden", { "x-correlation-id": CLIENT_CORRELATION_ID });

			expect(response.status).toBe(HttpStatus.FORBIDDEN);
			expect(response.headers.get("x-correlation-id")).toBe(CLIENT_CORRELATION_ID);
			expect(JSON.parse(response.body)).toEqual({ correlationID: CLIENT_CORRELATION_ID, error: "Forbidden", handledBy: "consumer", message: "MIDDLEWARE_FORBIDDEN", statusCode: HttpStatus.FORBIDDEN, timestamp: expect.any(Number) });
		});
	});

	describe("for http-errors values", () => {
		it.each(Object.keys(HTTP_ERRORS).map((name: string) => [name]))("answers the %s value by one rule, from a guard and from a handler", async (name: string) => {
			vi.spyOn(Date, "now").mockReturnValue(FROZEN_NOW);
			const application: INestApplication = await createApplication({ filters: [fullFilter] });
			const options: Omit<IInjectOptions, "url"> = { headers: { "x-correlation-id": CLIENT_CORRELATION_ID } };
			const [status, message, errorText] = HTTP_ERROR_ANSWERS[name] as [number, string, string];

			const guard: IInjectResponse = await inject(application, { ...options, url: `/contract/guard-http-error/${name}` });
			const handler: IInjectResponse = await inject(application, { ...options, url: `/contract/handler-http-error/${name}` });

			expect(guard.statusCode).toBe(status);
			expect(guard.json()).toEqual({ correlationID: CLIENT_CORRELATION_ID, error: errorText, message, statusCode: status, timestamp: FROZEN_NOW });
			expect(guard.headers["x-correlation-id"]).toBe(CLIENT_CORRELATION_ID);
			expect(guard.payload).not.toContain(SECRET_SENTINEL);
			expect(handler.statusCode).toBe(status);
			expect(handler.payload).toBe(guard.payload);
		});

		it("logs a server http-errors value once and a client one never", async () => {
			const application: INestApplication = await createApplication({ filters: [fullFilter] });

			await inject(application, { url: "/contract/guard-http-error/client-error" });
			expect(errorLog).not.toHaveBeenCalled();

			await inject(application, { url: "/contract/guard-http-error/hidden-server-error" });
			expect(errorLog).toHaveBeenCalledTimes(1);
			expect(JSON.stringify(errorLog.mock.calls)).not.toContain(SECRET_SENTINEL);
		});
	});

	describe("with the documented rate limiting setup", () => {
		it("answers the eleventh request with the contract and retry-after", async () => {
			const moduleReference = await Test.createTestingModule({
				imports: [E2eContractModule, ThrottlerModule.forRoot({ throttlers: [{ limit: 10, ttl: 60_000 }] })],
				providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
			}).compile();
			const application: INestApplication = moduleReference.createNestApplication(new FastifyAdapter(), { logger: false });

			application.useGlobalFilters(new CorrelationIDResponseBodyExceptionFilter(application.get(HttpAdapterHost)));
			application.useGlobalInterceptors(new CorrelationIDResponseBodyInterceptor());
			applications.push(application);
			await application.init();
			await (application.getHttpAdapter().getInstance() as IFastifyInjector).ready();

			for (let index: number = 0; index < 10; index += 1) {
				expect((await inject(application, { url: "/contract/handler-object" })).statusCode).toBe(HttpStatus.BAD_REQUEST);
			}

			const response: IInjectResponse = await inject(application, { url: "/contract/handler-object" });

			expect(response.statusCode).toBe(HttpStatus.TOO_MANY_REQUESTS);
			expect(response.json()).toEqual({ correlationID: response.headers["x-correlation-id"], error: "Too Many Requests", message: "ThrottlerException: Too Many Requests", statusCode: HttpStatus.TOO_MANY_REQUESTS, timestamp: expect.any(Number) });
			expect(Number(response.headers["retry-after"])).toBeGreaterThan(0);
		});
	});

	describe("next to a consumer filter", () => {
		it("lets a consumer filter registered later win, with the raw failure and without double handling", async () => {
			const consumer: E2eConsumerRawFilter = new E2eConsumerRawFilter();
			const application: INestApplication = await createApplication({ filters: [fullFilter, () => consumer] });
			const response: IInjectResponse = await inject(application, { url: "/contract/guard-object" });

			expect(response.payload).toBe('{"handledBy":"consumer","statusCode":403}');
			expect(consumer.seen).toHaveLength(1);
			expect((consumer.seen[0] as HttpException).cause).toBeUndefined();
			expect(response.headers).not.toHaveProperty("x-correlation-id");
		});

		it("never reaches a consumer filter registered earlier", async () => {
			const consumer: E2eConsumerRawFilter = new E2eConsumerRawFilter();
			const application: INestApplication = await createApplication({ filters: [() => consumer, fullFilter] });

			expect((await inject(application, { url: "/contract/guard-object" })).json()).toHaveProperty("correlationID");
			expect(consumer.seen).toHaveLength(0);
		});

		it("lets a useGlobalFilters registration win over an APP_FILTER one", async () => {
			const consumer: E2eConsumerRawFilter = new E2eConsumerRawFilter();
			const application: INestApplication = await createApplication({ filters: [fullFilter], providers: [{ provide: APP_FILTER, useValue: consumer }] });

			expect((await inject(application, { url: "/contract/guard-object" })).json()).toHaveProperty("correlationID");
			expect(consumer.seen).toHaveLength(0);
		});

		it("works when registered with APP_FILTER", async () => {
			const application: INestApplication = await createApplication({ providers: [{ provide: APP_FILTER, useClass: CorrelationIDResponseBodyExceptionFilter }] });
			const response: IInjectResponse = await inject(application, { url: "/contract/guard-object" });

			expect(response.statusCode).toBe(HttpStatus.FORBIDDEN);
			expect(response.json().correlationID).toBe(response.headers["x-correlation-id"]);
		});

		it("gives a consumer filter the contract through CorrelationIDNormalizeException", async () => {
			const application: INestApplication = await createApplication({ filters: [consumerNormalizingFilter] });
			const response: IInjectResponse = await inject(application, { headers: { "x-correlation-id": CLIENT_CORRELATION_ID }, url: "/contract/guard-unknown" });

			expect(response.json()).toEqual({ correlationID: CLIENT_CORRELATION_ID, error: "Internal Server Error", handledBy: "consumer", message: "Internal server error", statusCode: HttpStatus.INTERNAL_SERVER_ERROR, timestamp: expect.any(Number) });
			expect(response.headers["x-correlation-id"]).toBe(CLIENT_CORRELATION_ID);
			expect(E2eConsumerNormalizingFilter.causes).toEqual([guardFailure]);
			expect(errorLog).toHaveBeenCalledTimes(1);
			expect(logContext(errorLog, 0)).toBe("NestJS-Crud-Automator/CorrelationIDNormalizeException");
		});

		it("returns an interceptor failure unchanged through CorrelationIDNormalizeException", async () => {
			const application: INestApplication = await createApplication({ filters: [consumerNormalizingFilter] });
			const response: IInjectResponse = await inject(application, { url: "/contract/handler-object" });

			expect(E2eConsumerNormalizingFilter.causes[0]).toBeInstanceOf(BadRequestException);
			expect(E2eConsumerNormalizingFilter.causes[0]).toBe((E2eConsumerNormalizingFilter.seen[0] as HttpException).cause);
			expect(response.json().message).toBe("HANDLER_OBJECT");
			expect(errorLog).not.toHaveBeenCalled();
		});
	});
});

class E2eInMemoryStrategy extends Server implements CustomTransportStrategy {
	public close(): void {}

	public listen(callback: () => void): void {
		callback();
	}

	public on(): void {}

	public unwrap<T>(): T {
		return undefined as T;
	}
}

@Controller()
class E2eRpcController {
	@MessagePattern("rpc-exception")
	public rpcException(): void {
		throw new RpcException("RPC_FAILURE");
	}

	@MessagePattern("unknown")
	public unknown(): void {
		throw new Error(SECRET_SENTINEL);
	}

	@MessagePattern("http-exception")
	public httpException(): void {
		throw new ForbiddenException("HTTP_IN_RPC");
	}
}

/**
 * Runs a message pattern through a hybrid application and returns the rejection the transport receives.
 * @param {string} pattern - The message pattern.
 * @param {Array<Provider>} providers - Root providers.
 * @param {boolean} hasFilter - Whether to register the filter with useGlobalFilters.
 * @param {boolean} [hasInterceptor] - Whether to register the interceptor with useGlobalInterceptors.
 * @returns {Promise<unknown>} The rejection value.
 */
async function runRpc(pattern: string, providers: Array<Provider>, hasFilter: boolean, hasInterceptor: boolean = false): Promise<unknown> {
	const moduleReference = await Test.createTestingModule({ controllers: [E2eRpcController], providers }).compile();
	const application: INestApplication = moduleReference.createNestApplication(new FastifyAdapter(), { logger: false });
	const strategy: E2eInMemoryStrategy = new E2eInMemoryStrategy();

	if (hasFilter) {
		application.useGlobalFilters(new CorrelationIDResponseBodyExceptionFilter(application.get(HttpAdapterHost)));
	}

	if (hasInterceptor) {
		application.useGlobalInterceptors(new CorrelationIDResponseBodyInterceptor());
	}

	(application as unknown as { connectMicroservice: (options: { strategy: CustomTransportStrategy }, hybrid: { inheritAppConfig: boolean }) => unknown }).connectMicroservice({ strategy }, { inheritAppConfig: true });
	await (application as unknown as { startAllMicroservices: () => Promise<unknown> }).startAllMicroservices();
	await application.init();

	try {
		const handler: MessageHandler = strategy.getHandlerByPattern(pattern) as MessageHandler;
		const result: unknown = await handler({}, {});

		return isObservable(result)
			? await lastValueFrom(result).then(
					() => "resolved",
					(error: unknown) => error,
				)
			: result;
	} finally {
		await application.close();
	}
}

@WebSocketGateway()
class E2eBareGateway {
	@SubscribeMessage("bare-ws")
	public ws(): void {
		throw new WsException("WS_FAILURE");
	}

	@SubscribeMessage("bare-unknown")
	public unknown(): void {
		throw new Error(SECRET_SENTINEL);
	}
}

@UseInterceptors(CorrelationIDResponseBodyInterceptor)
@WebSocketGateway()
class E2eInterceptedGateway {
	@SubscribeMessage("intercepted-ws")
	public ws(): void {
		throw new WsException("WS_FAILURE");
	}
}

@UseFilters(CorrelationIDResponseBodyExceptionFilter)
@WebSocketGateway()
class E2eFilteredGateway {
	@SubscribeMessage("filtered-ws")
	public ws(): void {
		throw new WsException("WS_FAILURE");
	}
}

interface IGatewayResult {
	acknowledgement: unknown;
	exceptions: Array<unknown>;
}

const GATEWAY_WAIT_MS: number = 300;

/**
 * Sends one gateway message from a real socket.io client and returns what that client received.
 * @param {string} message - The subscribed message.
 * @param {Array<Type<unknown>>} gateways - Gateways to register.
 * @param {boolean} [hasGlobalFilter] - Whether to register the filter with useGlobalFilters.
 * @param {boolean} [hasGlobalInterceptor] - Whether to register the interceptor with useGlobalInterceptors.
 * @returns {Promise<IGatewayResult>} The acknowledgement, or the timeout error when none came, and the `exception` events.
 */
async function runGateway(message: string, gateways: Array<Type<unknown>>, hasGlobalFilter: boolean = false, hasGlobalInterceptor: boolean = false): Promise<IGatewayResult> {
	const moduleReference = await Test.createTestingModule({ providers: gateways }).compile();
	const application: INestApplication = moduleReference.createNestApplication(new FastifyAdapter(), { logger: false });

	application.useWebSocketAdapter(new IoAdapter(application));

	if (hasGlobalFilter) {
		application.useGlobalFilters(new CorrelationIDResponseBodyExceptionFilter(application.get(HttpAdapterHost)));
	}

	if (hasGlobalInterceptor) {
		application.useGlobalInterceptors(new CorrelationIDResponseBodyInterceptor());
	}

	await application.listen(0, "127.0.0.1");

	const socket: Socket = io(await application.getUrl(), { transports: ["websocket"] });
	const exceptions: Array<unknown> = [];

	try {
		await new Promise<void>((resolve: () => void) => {
			socket.on("connect", resolve);
		});
		socket.on("exception", (payload: unknown) => {
			exceptions.push(payload);
		});

		const acknowledgement: unknown = await socket
			.timeout(GATEWAY_WAIT_MS)
			.emitWithAck(message, { payload: true })
			.catch((error: unknown) => (error instanceof Error ? error.message : error));

		return { acknowledgement, exceptions };
	} finally {
		socket.close();
		await application.close();
	}
}

describe("CorrelationIDResponseBodyExceptionFilter outside HTTP (E2E)", () => {
	const unhandled: Array<unknown> = [];
	const recordUnhandled = (reason: unknown): void => {
		unhandled.push(reason);
	};

	let warningLog: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		unhandled.length = 0;
		process.on("unhandledRejection", recordUnhandled);
		vi.spyOn(ConsoleLogger.prototype, "error").mockImplementation(() => undefined);
		warningLog = vi.spyOn(ConsoleLogger.prototype, "warn").mockImplementation(() => undefined);
	});

	afterEach(() => {
		process.off("unhandledRejection", recordUnhandled);
		vi.restoreAllMocks();
	});

	it.each([["rpc-exception"], ["unknown"], ["http-exception"]])("leaves the %s RPC failure to the default handler for useGlobalFilters", async (pattern: string) => {
		expect(await runRpc(pattern, [], true)).toEqual(await runRpc(pattern, [], false));
		expect(unhandled).toEqual([]);
	});

	it.each([["rpc-exception"], ["unknown"], ["http-exception"]])("leaves the %s RPC failure to the default handler for APP_FILTER", async (pattern: string) => {
		expect(await runRpc(pattern, [{ provide: APP_FILTER, useClass: CorrelationIDResponseBodyExceptionFilter }], false)).toEqual(await runRpc(pattern, [], false));
		expect(unhandled).toEqual([]);
	});

	it("warns once when the global filter sees an RPC failure", async () => {
		await runRpc("rpc-exception", [], true);

		expect(warningLog).toHaveBeenCalledTimes(1);
		expect(warningLog.mock.calls[0]?.[0]).toBe("Not an HTTP context (rpc): the failure gets no correlation contract");
		expect(logContext(warningLog, 0)).toBe("NestJS-Crud-Automator/CorrelationIDResponseBodyExceptionFilter");
	});

	it.each([["rpc-exception"], ["unknown"]])("passes the %s RPC call through the global interceptor unchanged with one warning", async (pattern: string) => {
		const bare: unknown = await runRpc(pattern, [], false);

		expect(warningLog).not.toHaveBeenCalled();
		expect(await runRpc(pattern, [], false, true)).toEqual(bare);
		expect(warningLog).toHaveBeenCalledTimes(1);
		expect(warningLog.mock.calls[0]?.[0]).toBe("Not an HTTP context (rpc): the call passes without the correlation contract");
		expect(logContext(warningLog, 0)).toBe("NestJS-Crud-Automator/CorrelationIDResponseBodyInterceptor");
		expect(unhandled).toEqual([]);
	});

	it("does not reach gateways when the interceptor is registered globally", async () => {
		const bare: IGatewayResult = await runGateway("bare-ws", [E2eBareGateway]);

		expect(await runGateway("bare-ws", [E2eBareGateway], false, true)).toEqual(bare);
		expect(warningLog).not.toHaveBeenCalled();
	});

	it("passes a gateway call through an interceptor applied to the gateway unchanged with one warning", async () => {
		const bare: IGatewayResult = await runGateway("bare-ws", [E2eBareGateway]);

		expect(await runGateway("intercepted-ws", [E2eInterceptedGateway])).toEqual({ ...bare, exceptions: [{ cause: { data: { payload: true }, pattern: "intercepted-ws" }, message: "WS_FAILURE", status: "error" }] });
		expect(warningLog).toHaveBeenCalledTimes(1);
		expect(warningLog.mock.calls[0]?.[0]).toBe("Not an HTTP context (ws): the call passes without the correlation contract");
		expect(logContext(warningLog, 0)).toBe("NestJS-Crud-Automator/CorrelationIDResponseBodyInterceptor");
	});

	it("gives the default RPC answers the filter does not touch", async () => {
		expect(await runRpc("rpc-exception", [], true)).toEqual({ message: "RPC_FAILURE", status: "error" });
		expect(await runRpc("unknown", [], true)).toEqual({ message: "Internal server error", status: "error" });
	});

	it("gives the default gateway answer the filter does not touch", async () => {
		expect(await runGateway("bare-ws", [E2eBareGateway], true)).toEqual({ acknowledgement: "operation has timed out", exceptions: [{ cause: { data: { payload: true }, pattern: "bare-ws" }, message: "WS_FAILURE", status: "error" }] });
	});

	it.each([["bare-ws"], ["bare-unknown"]])("does not reach gateways for the %s failure when registered globally", async (message: string) => {
		const bare: IGatewayResult = await runGateway(message, [E2eBareGateway]);

		expect(bare.exceptions).toHaveLength(1);
		expect(await runGateway(message, [E2eBareGateway], true)).toEqual(bare);
		expect(unhandled).toEqual([]);
	});

	it("leaves the socket.io client without an answer when applied to a gateway, which the docs forbid", async () => {
		expect(await runGateway("filtered-ws", [E2eFilteredGateway])).toEqual({ acknowledgement: "operation has timed out", exceptions: [] });
		expect(unhandled).toEqual([]);
		expect(warningLog).toHaveBeenCalledTimes(1);
		expect(warningLog.mock.calls[0]?.[0]).toBe("Not an HTTP context (ws): the failure gets no correlation contract");
		expect(logContext(warningLog, 0)).toBe("NestJS-Crud-Automator/CorrelationIDResponseBodyExceptionFilter");
	});
});
