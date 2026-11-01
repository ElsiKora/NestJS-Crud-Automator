import "reflect-metadata";

import type { ArgumentsHost, CanActivate, ExceptionFilter, HttpException, INestApplication, MiddlewareConsumer, NestMiddleware, NestModule } from "@nestjs/common";
import type { IncomingMessage } from "node:http";

import { request as httpRequest } from "node:http";
import { connect } from "node:net";

import { BadRequestException, Catch, Controller, ForbiddenException, Get, Module, UnauthorizedException, UseGuards } from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { CorrelationIDNormalizeException, CorrelationIDResponseBodyExceptionFilter, CorrelationIDResponseBodyInterceptor } from "../../src/index";

const UUID_PATTERN: RegExp = /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/u;

@Controller("correlation-bounds")
class E2eCorrelationBoundsController {
	@Get("fail")
	public fail(): void {
		throw new BadRequestException("bad");
	}
}

class E2eRejectingGuard implements CanActivate {
	public canActivate(): boolean {
		throw new ForbiddenException("guard");
	}
}

class E2eRejectingMiddleware implements NestMiddleware {
	public use(): void {
		throw new UnauthorizedException("middleware");
	}
}

@Controller("correlation-filter")
class E2eCorrelationFilterController {
	@Get("guard")
	@UseGuards(E2eRejectingGuard)
	public guard(): void {}

	@Get("handler")
	public handler(): void {
		throw new BadRequestException("handler");
	}

	@Get("middleware")
	public middleware(): void {}

	@Get("success")
	public success(): { isOk: boolean } {
		return { isOk: true };
	}
}

@Catch()
class E2eNormalizingFilter implements ExceptionFilter {
	public constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

	public catch(exception: unknown, host: ArgumentsHost): void {
		const normalized: HttpException = CorrelationIDNormalizeException(exception, host, this.httpAdapterHost);

		this.httpAdapterHost.httpAdapter.reply(host.getArgByIndex(1), normalized.getResponse(), normalized.getStatus());
	}
}

@Module({ controllers: [E2eCorrelationFilterController] })
class E2eCorrelationFilterModule implements NestModule {
	public configure(consumer: MiddlewareConsumer): void {
		consumer.apply(E2eRejectingMiddleware).forRoutes("correlation-filter/middleware");
	}
}

/**
 * Sends a request over a real socket, where a repeated header reaches Node.js as separate lines.
 * @param {number} port - Listening port.
 * @param {string} path - Request path.
 * @param {Array<string> | string} [correlationId] - The x-correlation-id request header.
 * @returns {Promise<{ body: Record<string, unknown>; header: unknown; status: number | undefined }>} Status, response header, and parsed body.
 */
async function requestOverSocket(port: number, path: string, correlationId?: Array<string> | string): Promise<{ body: Record<string, unknown>; header: unknown; status: number | undefined }> {
	return new Promise((resolve, reject) => {
		const clientRequest = httpRequest({ headers: correlationId === undefined ? {} : { "x-correlation-id": correlationId }, host: "127.0.0.1", path, port }, (response: IncomingMessage) => {
			const chunks: Array<Buffer> = [];

			response.on("data", (chunk: Buffer) => chunks.push(chunk));
			response.on("error", reject);
			response.on("end", () => {
				resolve({ body: JSON.parse(Buffer.concat(chunks).toString()) as Record<string, unknown>, header: response.headers["x-correlation-id"], status: response.statusCode });
			});
		});

		clientRequest.on("error", reject);
		clientRequest.end();
	});
}

/**
 * Writes raw bytes to the server, for requests a Node.js client refuses to send.
 * @param {number} port - Listening port.
 * @param {string} payload - The raw request.
 * @returns {Promise<string>} The raw answer.
 */
async function sendRawRequest(port: number, payload: string): Promise<string> {
	return new Promise((resolve, reject) => {
		const chunks: Array<Buffer> = [];
		const socket = connect(port, "127.0.0.1", () => socket.write(payload));

		socket.on("data", (chunk: Buffer) => chunks.push(chunk));
		socket.on("error", reject);
		socket.on("close", () => {
			resolve(Buffer.concat(chunks).toString());
		});
	});
}

interface IFastifyInjector {
	inject: (options: { headers?: Record<string, Array<string> | string>; method: string; url: string }) => Promise<{ headers: Record<string, unknown>; json: () => Record<string, unknown>; statusCode: number }>;
}

describe("CorrelationIDResponseBodyInterceptor client ID bounds (E2E)", () => {
	let application: INestApplication | undefined;

	const request = (headers: Record<string, Array<string> | string>): ReturnType<IFastifyInjector["inject"]> => (application?.getHttpAdapter().getInstance() as IFastifyInjector).inject({ headers, method: "GET", url: "/correlation-bounds/fail" });

	beforeAll(async () => {
		const moduleReference = await Test.createTestingModule({ controllers: [E2eCorrelationBoundsController] }).compile();
		application = moduleReference.createNestApplication(new FastifyAdapter());
		application.useGlobalInterceptors(new CorrelationIDResponseBodyInterceptor());
		await application.init();
		await (application.getHttpAdapter().getInstance() as { ready: () => Promise<void> }).ready();
	});

	afterAll(async () => {
		await application?.close();
	});

	it.each([
		["1 character", "a"],
		["128 characters", "a".repeat(128)],
		["every allowed character", "AZaz09._:-"],
	])("echoes a client ID of %s in the header and the body", async (_label: string, value: string) => {
		const response = await request({ "x-correlation-id": value });

		expect(response.statusCode).toBe(400);
		expect(response.headers["x-correlation-id"]).toBe(value);
		expect(response.json().correlationID).toBe(value);
	});

	it.each([
		["no header", {}],
		["0 characters", { "x-correlation-id": "" }],
		["129 characters", { "x-correlation-id": "a".repeat(129) }],
		["9000 bytes", { "x-correlation-id": "a".repeat(9000) }],
		["a disallowed character", { "x-correlation-id": "corr/id" }],
		["a header-legal punctuation run", { "x-correlation-id": "<script>alert(1)</script>" }],
		["a repeated header", { "x-correlation-id": ["first-id", "second-id"] }],
	])("answers one generated ID in the header and the body for %s", async (_label: string, headers: Record<string, Array<string> | string>) => {
		const response = await request(headers);
		const headerValue: unknown = response.headers["x-correlation-id"];

		expect(response.statusCode).toBe(400);
		expect(headerValue).toMatch(UUID_PATTERN);
		expect(response.json().correlationID).toBe(headerValue);
	});
});

const ACCEPTED: Array<[string, string]> = [
	["1 character", "a"],
	["128 characters", "a".repeat(128)],
	["every allowed character", "AZaz09._:-"],
];
const REJECTED: Array<[string, Array<string> | string | undefined]> = [
	["no header", undefined],
	["0 characters", ""],
	["129 characters", "a".repeat(129)],
	["9000 bytes", "a".repeat(9000)],
	["a slash", "corr/id"],
	["a percent sign", "corr%0aid"],
	["an inner space", "corr id"],
	["a repeated header", ["first-id", "second-id"]],
];
const GUARD_ROUTE: [string, string, number] = ["guard", "/correlation-filter/guard", 403];
const HANDLER_ROUTE: [string, string, number] = ["handler", "/correlation-filter/handler", 400];
const MIDDLEWARE_ROUTE: [string, string, number] = ["middleware", "/correlation-filter/middleware", 401];
const SUCCESS_ROUTE: [string, string, number] = ["success", "/correlation-filter/success", 200];
const UNMATCHED_ROUTE: [string, string, number] = ["unmatched route", "/correlation-filter/unmatched", 404];

describe.each<[string, (application: INestApplication) => void, Array<[string, string, number]>]>([
	[
		"the filter and the interceptor",
		(application: INestApplication) => {
			application.useGlobalFilters(new CorrelationIDResponseBodyExceptionFilter(application.get(HttpAdapterHost)));
			application.useGlobalInterceptors(new CorrelationIDResponseBodyInterceptor());
		},
		[GUARD_ROUTE, MIDDLEWARE_ROUTE, HANDLER_ROUTE, UNMATCHED_ROUTE, SUCCESS_ROUTE],
	],
	[
		"the filter alone",
		(application: INestApplication) => {
			application.useGlobalFilters(new CorrelationIDResponseBodyExceptionFilter(application.get(HttpAdapterHost)));
		},
		[GUARD_ROUTE, MIDDLEWARE_ROUTE, HANDLER_ROUTE, UNMATCHED_ROUTE],
	],
	[
		"a filter calling CorrelationIDNormalizeException",
		(application: INestApplication) => {
			application.useGlobalFilters(new E2eNormalizingFilter(application.get(HttpAdapterHost)));
		},
		[GUARD_ROUTE, MIDDLEWARE_ROUTE, HANDLER_ROUTE, UNMATCHED_ROUTE],
	],
	[
		"the interceptor alone",
		(application: INestApplication) => {
			application.useGlobalInterceptors(new CorrelationIDResponseBodyInterceptor());
		},
		[HANDLER_ROUTE, SUCCESS_ROUTE],
	],
])("client ID bounds over a real socket with %s (E2E)", (_setup: string, register: (application: INestApplication) => void, routes: Array<[string, string, number]>) => {
	let application: INestApplication | undefined;
	let port: number = 0;

	beforeAll(async () => {
		const moduleReference = await Test.createTestingModule({ imports: [E2eCorrelationFilterModule] }).compile();
		application = moduleReference.createNestApplication(new FastifyAdapter(), { logger: false });
		register(application);
		await application.listen(0, "127.0.0.1");
		({ port } = application.getHttpServer().address() as { port: number });
	});

	afterAll(async () => {
		await application?.close();
	});

	describe.each(routes)("%s", (route: string, path: string, status: number) => {
		const expectBody = (body: Record<string, unknown>, correlationId: unknown): void => {
			if (route === "success") {
				expect(body).toEqual({ isOk: true });
			} else {
				expect(body.correlationID).toBe(correlationId);
			}
		};

		it.each(ACCEPTED)("echoes a client ID of %s", async (_label: string, value: string) => {
			const response = await requestOverSocket(port, path, value);

			expect(response.status).toBe(status);
			expect(response.header).toBe(value);
			expectBody(response.body, value);
		});

		it("keeps a client ID whose surrounding whitespace Node.js strips before the rule", async () => {
			const response = await requestOverSocket(port, path, "  corr-id  ");

			expect(response.status).toBe(status);
			expect(response.header).toBe("corr-id");
			expectBody(response.body, "corr-id");
		});

		it.each(REJECTED)("answers one generated ID for %s", async (_label: string, value: Array<string> | string | undefined) => {
			const response = await requestOverSocket(port, path, value);

			expect(response.status).toBe(status);
			expect(response.header).toMatch(UUID_PATTERN);
			expectBody(response.body, response.header);
		});
	});

	it.each([
		["a bare CR", "x-correlation-id: a\rb\r\n"],
		["a bare LF", "x-correlation-id: a\nb\r\n"],
		["a NUL", "x-correlation-id: a\0b\r\n"],
		["an obsolete line folding", "x-correlation-id: a\r\n b\r\n"],
	])("leaves %s to the 400 of the Node.js parser, with no correlation ID", async (_label: string, headerLines: string) => {
		const answer: string = await sendRawRequest(port, `GET ${routes[0]?.[1] ?? "/"} HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n${headerLines}\r\n`);

		expect(answer).toMatch(/^HTTP\/1\.1 400 /u);
		expect(answer.toLowerCase()).not.toContain("x-correlation-id");
		expect(answer).not.toContain("correlationID");
	});
});
