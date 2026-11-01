import type { CallHandler, ExecutionContext } from "@nestjs/common";

import { CorrelationIDResponseBodyInterceptor } from "@interceptor/correlation-id-response-body.interceptor";
import { BadRequestException, HttpException, HttpStatus, InternalServerErrorException } from "@nestjs/common";
import { ThrottlerException } from "@nestjs/throttler";
import { LoggerUtility } from "@utility/logger.utility";
import { lastValueFrom, throwError } from "rxjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

	describe("original failure as cause", () => {
		const correlationId: string = "corr-id";
		const timestamp: number = 1_704_067_200_000;
		let errorLog: ReturnType<typeof vi.spyOn>;
		let warningLog: ReturnType<typeof vi.spyOn>;

		const interceptFailure = async (failure: unknown): Promise<HttpException> => {
			const interceptor = new CorrelationIDResponseBodyInterceptor();
			const { context } = buildContext({ "x-correlation-id": correlationId });
			const handler: CallHandler = {
				handle: () => throwError(() => failure),
			};
			const rejection: unknown = await lastValueFrom(interceptor.intercept(context, handler)).then(
				() => undefined,
				(error: unknown) => error,
			);

			expect(rejection).toBeInstanceOf(HttpException);

			return rejection as HttpException;
		};

		beforeEach(() => {
			vi.spyOn(Date, "now").mockReturnValue(timestamp);
			errorLog = vi.spyOn(LoggerUtility.prototype, "error").mockImplementation(() => undefined);
			warningLog = vi.spyOn(LoggerUtility.prototype, "warn").mockImplementation(() => undefined);
		});

		it("keeps a ThrottlerException as cause with an unchanged body and status", async () => {
			const failure = new ThrottlerException("rate limited");

			const exception = await interceptFailure(failure);

			expect(exception.cause).toBe(failure);
			expect(exception.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
			expect(JSON.stringify(exception.getResponse())).toBe(`{"statusCode":429,"message":"rate limited","error":"Too Many Requests","timestamp":${timestamp},"correlationID":"${correlationId}"}`);
			expect(warningLog).toHaveBeenCalledTimes(1);
			expect(errorLog).not.toHaveBeenCalled();
		});

		it("keeps an HttpException with a string response as cause with an unchanged body and status", async () => {
			const failure = new HttpException("bad", HttpStatus.BAD_REQUEST);

			const exception = await interceptFailure(failure);

			expect(exception.cause).toBe(failure);
			expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
			expect(JSON.stringify(exception.getResponse())).toBe(`{"message":"bad","correlationID":"${correlationId}","timestamp":${timestamp}}`);
			expect(errorLog).not.toHaveBeenCalled();
		});

		it("keeps an HttpException with an object response as cause and leaves its own cause reachable", async () => {
			const rootCause = new Error("SECRET_ROOT_CAUSE");
			const failure = new BadRequestException("bad", { cause: rootCause });

			const exception = await interceptFailure(failure);

			expect(exception.cause).toBe(failure);
			expect((exception.cause as HttpException).cause).toBe(rootCause);
			expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
			expect(JSON.stringify(exception.getResponse())).toBe(`{"message":"bad","statusCode":400,"correlationID":"${correlationId}","timestamp":${timestamp}}`);
		});

		it("keeps a 5xx HttpException as cause and logs it once from the original failure", async () => {
			const failure = new InternalServerErrorException("SAFE_RESPONSE");

			const exception = await interceptFailure(failure);

			expect(exception.cause).toBe(failure);
			expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
			expect(JSON.stringify(exception.getResponse())).toBe(`{"message":"SAFE_RESPONSE","error":"Internal Server Error","statusCode":500,"correlationID":"${correlationId}","timestamp":${timestamp}}`);
			expect(errorLog.mock.calls).toEqual([[`HTTP ${HttpStatus.INTERNAL_SERVER_ERROR} errorType=InternalServerErrorException`]]);
		});

		it("keeps a generic Error as cause with an unchanged body and status", async () => {
			const secretSentinel: string = "SECRET_GENERIC_ERROR";
			const failure = new Error(secretSentinel);

			const exception = await interceptFailure(failure);

			expect(exception.cause).toBe(failure);
			expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
			expect(JSON.stringify(exception.getResponse())).toBe(`{"correlationID":"${correlationId}","error":"Internal server error","message":"Internal server error","statusCode":500,"timestamp":${timestamp}}`);
			expect(errorLog.mock.calls).toEqual([[`HTTP ${HttpStatus.INTERNAL_SERVER_ERROR} errorType=Error`]]);
		});

		it("keeps the status of an Error that exposes getStatus", async () => {
			const failure = Object.assign(new Error("gateway"), { getStatus: (): number => HttpStatus.BAD_GATEWAY });

			const exception = await interceptFailure(failure);

			expect(exception.cause).toBe(failure);
			expect(exception.getStatus()).toBe(HttpStatus.BAD_GATEWAY);
		});

		it.each([
			["a string", "SECRET_THROWN_STRING", "UnknownError"],
			["a number", 42, "UnknownError"],
			["zero", 0, "UnknownError"],
			["an empty string", "", "UnknownError"],
			["false", false, "UnknownError"],
			["null", null, "UnknownError"],
			["undefined", undefined, "UnknownError"],
			["a plain object", { detail: "SECRET_THROWN_OBJECT" }, "Object"],
		])("keeps %s thrown as a non-Error value as cause, not its replacement", async (_label: string, failure: unknown, errorType: string) => {
			const exception = await interceptFailure(failure);

			expect(exception.cause).toBe(failure);
			expect(exception.cause).not.toBeInstanceOf(InternalServerErrorException);
			expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
			expect(JSON.stringify(exception.getResponse())).toBe(`{"correlationID":"${correlationId}","error":"Internal server error","message":"Internal server error","statusCode":500,"timestamp":${timestamp}}`);
			expect(errorLog.mock.calls).toEqual([[`HTTP ${HttpStatus.INTERNAL_SERVER_ERROR} errorType=${errorType}`]]);
		});
	});
});
