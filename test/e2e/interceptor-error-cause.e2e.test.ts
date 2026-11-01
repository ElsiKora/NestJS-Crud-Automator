import "reflect-metadata";

import type { ArgumentsHost, ExceptionFilter, INestApplication } from "@nestjs/common";
import type { FastifyReply } from "fastify";

import { BadRequestException, Catch, ConsoleLogger, Controller, Get, HttpException, HttpStatus } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { ThrottlerException } from "@nestjs/throttler";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { CorrelationIDResponseBodyInterceptor } from "../../src/index";

const SECRET_SENTINEL: string = "SECRET_CAUSE_SENTINEL";

const rootCause: Error = new Error(SECRET_SENTINEL);
const badRequest: BadRequestException = new BadRequestException("SAFE_RESPONSE", { cause: rootCause });
const throttled: ThrottlerException = new ThrottlerException("SAFE_RESPONSE");
const unknownFailure: Error = new Error(SECRET_SENTINEL);

const FAILURES: Record<string, unknown> = {
	"bad-request": badRequest,
	"non-error": SECRET_SENTINEL,
	throttled,
	unknown: unknownFailure,
};

@Controller("error-cause")
class E2eErrorCauseController {
	@Get("bad-request")
	public badRequest(): void {
		throw FAILURES["bad-request"];
	}

	@Get("non-error")
	public nonError(): void {
		throw FAILURES["non-error"];
	}

	@Get("throttled")
	public throttled(): void {
		throw FAILURES.throttled;
	}

	@Get("unknown")
	public unknown(): void {
		throw FAILURES.unknown;
	}
}

@Catch(HttpException)
class E2eRecordingExceptionFilter implements ExceptionFilter<HttpException> {
	public readonly seen: Array<HttpException> = [];

	public catch(exception: HttpException, host: ArgumentsHost): void {
		this.seen.push(exception);

		void host.switchToHttp().getResponse<FastifyReply>().status(exception.getStatus()).send(exception.getResponse());
	}
}

interface IFastifyInjector {
	inject: (options: { method: string; url: string }) => Promise<{ json: () => Record<string, unknown>; payload: string; statusCode: number }>;
}

/**
 * Boots the failing controller behind the global interceptor.
 * @param {ExceptionFilter} [filter] - Optional consumer filter.
 * @returns {Promise<INestApplication>} Initialized application.
 */
async function createApplication(filter?: ExceptionFilter): Promise<INestApplication> {
	const moduleReference = await Test.createTestingModule({ controllers: [E2eErrorCauseController] }).compile();
	const application: INestApplication = moduleReference.createNestApplication(new FastifyAdapter());

	application.useGlobalInterceptors(new CorrelationIDResponseBodyInterceptor());

	if (filter) {
		application.useGlobalFilters(filter);
	}

	await application.init();
	await (application.getHttpAdapter().getInstance() as { ready: () => Promise<void> }).ready();

	return application;
}

describe("CorrelationIDResponseBodyInterceptor cause (E2E)", () => {
	const filter: E2eRecordingExceptionFilter = new E2eRecordingExceptionFilter();
	let defaultApp: INestApplication | undefined;
	let filteredApp: INestApplication | undefined;
	let errorLog: ReturnType<typeof vi.spyOn>;

	const request = (application: INestApplication | undefined, path: string): ReturnType<IFastifyInjector["inject"]> => (application?.getHttpAdapter().getInstance() as IFastifyInjector).inject({ method: "GET", url: `/error-cause/${path}` });

	beforeAll(async () => {
		defaultApp = await createApplication();
		filteredApp = await createApplication(filter);
	});

	beforeEach(() => {
		filter.seen.length = 0;
		errorLog = vi.spyOn(ConsoleLogger.prototype, "error").mockImplementation(() => undefined);
		vi.spyOn(ConsoleLogger.prototype, "warn").mockImplementation(() => undefined);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	afterAll(async () => {
		await defaultApp?.close();
		await filteredApp?.close();
	});

	it.each([
		["bad-request", HttpStatus.BAD_REQUEST, ["correlationID", "message", "statusCode", "timestamp"], 0],
		["throttled", HttpStatus.TOO_MANY_REQUESTS, ["correlationID", "error", "message", "statusCode", "timestamp"], 0],
		["unknown", HttpStatus.INTERNAL_SERVER_ERROR, ["correlationID", "error", "message", "statusCode", "timestamp"], 1],
		["non-error", HttpStatus.INTERNAL_SERVER_ERROR, ["correlationID", "error", "message", "statusCode", "timestamp"], 1],
	])("hands the original %s failure to a consumer filter and keeps it out of the response", async (path: string, status: number, bodyKeys: Array<string>, expectedLogs: number) => {
		const response = await request(filteredApp, path);

		expect(filter.seen).toHaveLength(1);
		expect(filter.seen[0]?.cause).toBe(FAILURES[path]);
		expect(response.statusCode).toBe(status);
		expect(Object.keys(response.json()).sort()).toEqual(bodyKeys);
		expect(response.payload).not.toContain(SECRET_SENTINEL);
		expect(errorLog).toHaveBeenCalledTimes(expectedLogs);
	});

	it("keeps the nested cause of an HttpException reachable from the filter", async () => {
		await request(filteredApp, "bad-request");

		expect((filter.seen[0]?.cause as HttpException).cause).toBe(rootCause);
	});

	it.each([
		["bad-request", HttpStatus.BAD_REQUEST, 0],
		["throttled", HttpStatus.TOO_MANY_REQUESTS, 0],
		["unknown", HttpStatus.INTERNAL_SERVER_ERROR, 1],
		["non-error", HttpStatus.INTERNAL_SERVER_ERROR, 1],
	])("answers the same %s body through the default Nest filter without logging twice", async (path: string, status: number, expectedLogs: number) => {
		const defaultResponse = await request(defaultApp, path);
		const filteredResponse = await request(filteredApp, path);
		const withoutVolatileFields = (body: Record<string, unknown>): Record<string, unknown> => ({ ...body, correlationID: undefined, timestamp: undefined });

		expect(defaultResponse.statusCode).toBe(status);
		expect(defaultResponse.payload).not.toContain(SECRET_SENTINEL);
		expect(withoutVolatileFields(defaultResponse.json())).toEqual(withoutVolatileFields(filteredResponse.json()));
		expect(errorLog).toHaveBeenCalledTimes(expectedLogs * 2);
	});
});
