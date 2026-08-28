import type { CallHandler, ExecutionContext } from "@nestjs/common";

import { CorrelationIDResponseBodyInterceptor } from "@interceptor/correlation-id-response-body.interceptor";
import { HttpException, HttpStatus } from "@nestjs/common";
import { ThrottlerException } from "@nestjs/throttler";
import { LoggerUtility } from "@utility/logger.utility";
import { lastValueFrom, throwError } from "rxjs";
import { afterEach, describe, expect, it, vi } from "vitest";

const buildContext = (headers: Record<string, string | string[] | undefined>) => {
	const reply = { header: vi.fn() };
	const request = {
		headers,
		method: "GET",
		url: "/test",
	};

	const context: ExecutionContext = {
		switchToHttp: () => ({
			getRequest: () => request,
			getResponse: () => reply,
		}),
	} as ExecutionContext;

	return { context, reply, request };
};

describe("CorrelationIDResponseBodyInterceptor", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("preserves correlation id header and wraps HttpException responses", async () => {
		const interceptor = new CorrelationIDResponseBodyInterceptor();
		const { context, reply, request } = buildContext({ "x-correlation-id": "corr-id" });
		const handler: CallHandler = {
			handle: () => throwError(() => new HttpException("bad", HttpStatus.BAD_REQUEST)),
		};

		await expect(lastValueFrom(interceptor.intercept(context, handler))).rejects.toBeInstanceOf(HttpException);
		expect(reply.header).toHaveBeenCalledWith("x-correlation-id", "corr-id");
		expect(request.headers["x-correlation-id"]).toBe("corr-id");
		expect((request as { correlationID?: string }).correlationID).toBe("corr-id");
	});

	it("normalizes array correlation headers and preserves object response fields", async () => {
		const interceptor = new CorrelationIDResponseBodyInterceptor();
		const { context, reply, request } = buildContext({ "x-correlation-id": [" ", "array-corr"] });
		const handler: CallHandler = {
			handle: () => throwError(() => new HttpException({ message: "bad", statusCode: HttpStatus.BAD_REQUEST }, HttpStatus.BAD_REQUEST)),
		};

		try {
			await lastValueFrom(interceptor.intercept(context, handler));
		} catch (error) {
			expect(error).toBeInstanceOf(HttpException);
			expect((error as HttpException).getResponse()).toEqual(
				expect.objectContaining({
					correlationID: "array-corr",
					message: "bad",
					statusCode: HttpStatus.BAD_REQUEST,
					timestamp: expect.any(Number),
				}),
			);
		}

		expect(reply.header).toHaveBeenCalledWith("x-correlation-id", "array-corr");
		expect(request.headers["x-correlation-id"]).toBe("array-corr");
		expect((request as { correlationID?: string }).correlationID).toBe("array-corr");
	});

	it("wraps ThrottlerException with correlation id", async () => {
		const interceptor = new CorrelationIDResponseBodyInterceptor();
		const { context, reply, request } = buildContext({});
		const rawUrlSentinel: string = "/SECRET_RATE_LIMIT_URL";
		const warningLog = vi.spyOn(LoggerUtility.prototype, "warn").mockImplementation(() => undefined);
		request.url = rawUrlSentinel;
		const handler: CallHandler = {
			handle: () => throwError(() => new ThrottlerException("rate limited")),
		};

		try {
			await lastValueFrom(interceptor.intercept(context, handler));
		} catch (error) {
			expect(error).toBeInstanceOf(HttpException);
			expect((error as HttpException).getResponse()).toEqual(
				expect.objectContaining({
					correlationID: expect.any(String),
					error: "Too Many Requests",
					statusCode: HttpStatus.TOO_MANY_REQUESTS,
					timestamp: expect.any(Number),
				}),
			);
		}

		expect(reply.header).toHaveBeenCalledWith("x-correlation-id", expect.any(String));
		expect(typeof request.headers["x-correlation-id"]).toBe("string");
		expect((request as { correlationID?: string }).correlationID).toBe(request.headers["x-correlation-id"]);
		expect(warningLog).toHaveBeenCalledTimes(1);
		expect(warningLog.mock.calls[0]).toEqual([`HTTP ${HttpStatus.TOO_MANY_REQUESTS} rateLimited`]);
		expect(warningLog.mock.calls.flat().join(" ")).not.toContain(rawUrlSentinel);
	});

	it("wraps unknown errors as internal server HttpException", async () => {
		const interceptor = new CorrelationIDResponseBodyInterceptor();
		const { context, request } = buildContext({});
		const secretSentinel: string = "SECRET_UNKNOWN_MESSAGE_STACK_URL";
		const errorLog = vi.spyOn(LoggerUtility.prototype, "error").mockImplementation(() => undefined);
		request.url = secretSentinel;
		const handler: CallHandler = {
			handle: () => throwError(() => new Error(secretSentinel)),
		};

		try {
			await lastValueFrom(interceptor.intercept(context, handler));
		} catch (error) {
			expect(error).toBeInstanceOf(HttpException);
			expect((error as HttpException).getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
			expect((error as HttpException).getResponse()).toEqual(
				expect.objectContaining({
					correlationID: expect.any(String),
					error: "Internal server error",
					message: "Internal server error",
					statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
					timestamp: expect.any(Number),
				}),
			);
		}

		expect(errorLog).toHaveBeenCalledTimes(1);
		expect(errorLog.mock.calls[0]).toEqual([`HTTP ${HttpStatus.INTERNAL_SERVER_ERROR} errorType=Error`]);
		expect(errorLog.mock.calls.flat().join(" ")).not.toContain(secretSentinel);
	});

	it("emits one bounded log for an HttpException 5xx and preserves its response", async () => {
		const interceptor = new CorrelationIDResponseBodyInterceptor();
		const { context, request } = buildContext({ "x-correlation-id": "safe-correlation" });
		const secretSentinel: string = "SECRET_QUERY_PARAMETERS_DRIVER_MESSAGE_STACK_URL_PROFILE_IP";
		const driverError: Error & { code?: string; query?: string } = new Error(secretSentinel);
		driverError.code = "40001";
		driverError.query = secretSentinel;
		const cause = Object.assign(new Error(secretSentinel), {
			driverError,
			name: "QueryFailedError",
			parameters: [secretSentinel],
			query: secretSentinel,
		});
		const sourceError = new HttpException({ error: "Safe failure", message: "SAFE_RESPONSE", statusCode: HttpStatus.INTERNAL_SERVER_ERROR }, HttpStatus.INTERNAL_SERVER_ERROR, { cause });
		const errorLog = vi.spyOn(LoggerUtility.prototype, "error").mockImplementation(() => undefined);
		request.url = secretSentinel;
		const handler: CallHandler = {
			handle: () => throwError(() => sourceError),
		};

		try {
			await lastValueFrom(interceptor.intercept(context, handler));
		} catch (error) {
			expect(error).toBeInstanceOf(HttpException);
			expect((error as HttpException).getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
			expect((error as HttpException).getResponse()).toEqual(
				expect.objectContaining({
					correlationID: "safe-correlation",
					error: "Safe failure",
					message: "SAFE_RESPONSE",
					statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
					timestamp: expect.any(Number),
				}),
			);
		}

		expect(errorLog).toHaveBeenCalledTimes(1);
		expect(errorLog.mock.calls[0]).toEqual([`HTTP ${HttpStatus.INTERNAL_SERVER_ERROR} errorType=HttpException sqlState=40001`]);
		expect(errorLog.mock.calls.flat().join(" ")).not.toContain(secretSentinel);
	});
});
