import type { CallHandler, ExecutionContext } from "@nestjs/common";

import { CorrelationIDResponseBodyInterceptor } from "@interceptor/correlation-id-response-body.interceptor";
import { BadRequestException, HttpException, HttpStatus, InternalServerErrorException } from "@nestjs/common";
import { ThrottlerException } from "@nestjs/throttler";
import { LoggerUtility } from "@utility/logger.utility";
import { lastValueFrom, throwError } from "rxjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const UUID_PATTERN: RegExp = /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/u;

const buildContext = (headers: Record<string, string | string[] | undefined>, type: string = "http") => {
	const reply = { header: vi.fn() };
	const request = {
		headers,
		method: "GET",
		url: "/test",
	};

	const context: ExecutionContext = {
		getType: () => type,
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

	it.each([["rpc"], ["ws"], ["graphql"]])("passes a %s call through unchanged and warns once", async (type: string) => {
		const warningLog = vi.spyOn(LoggerUtility.prototype, "warn").mockImplementation(() => undefined);
		const interceptor = new CorrelationIDResponseBodyInterceptor();
		const { context } = buildContext({}, type);
		const switchToHttp = vi.spyOn(context, "switchToHttp");
		const failure: Error = new Error("SECRET_FAILURE");

		await expect(lastValueFrom(interceptor.intercept(context, { handle: () => throwError(() => failure) }))).rejects.toBe(failure);
		expect(switchToHttp).not.toHaveBeenCalled();
		expect(warningLog.mock.calls).toEqual([[`Not an HTTP context (${type}): the call passes without the correlation contract`]]);
		expect(warningLog.mock.contexts[0]).toEqual(expect.objectContaining({ context: "NestJS-Crud-Automator/CorrelationIDResponseBodyInterceptor" }));
	});

	it.each<[string, unknown, number, string]>([
		["an http-errors value without expose", { message: "No such customer: cus_SECRET", statusCode: HttpStatus.NOT_FOUND }, HttpStatus.NOT_FOUND, "Not Found"],
		["an http-errors value with expose false", { expose: false, message: "SECRET", statusCode: HttpStatus.NOT_FOUND }, HttpStatus.NOT_FOUND, "Not Found"],
		["an http-errors value with expose true", { expose: true, message: "PUBLIC", statusCode: HttpStatus.NOT_FOUND }, HttpStatus.NOT_FOUND, "PUBLIC"],
		["a string status", { expose: true, message: "SECRET", statusCode: "404" }, HttpStatus.INTERNAL_SERVER_ERROR, "Internal server error"],
		["a status of 1000", { expose: true, message: "SECRET", statusCode: 1000 }, HttpStatus.INTERNAL_SERVER_ERROR, "Internal server error"],
		["a status of 200", { expose: true, message: "SECRET", statusCode: 200 }, HttpStatus.INTERNAL_SERVER_ERROR, "Internal server error"],
		["a status of 302", { expose: true, message: "SECRET", statusCode: HttpStatus.FOUND }, HttpStatus.INTERNAL_SERVER_ERROR, "Internal server error"],
	])("answers %s from the handler chain by the http-errors rule", async (_name: string, failure: unknown, status: number, message: string) => {
		vi.spyOn(LoggerUtility.prototype, "error").mockImplementation(() => undefined);
		const { context } = buildContext({ "x-correlation-id": "corr-id" });
		const error: unknown = await lastValueFrom(new CorrelationIDResponseBodyInterceptor().intercept(context, { handle: () => throwError(() => failure) })).catch((caught: unknown) => caught);

		expect((error as HttpException).getStatus()).toBe(status);
		expect((error as HttpException).getResponse()).toEqual({ correlationID: "corr-id", error: expect.any(String), message, statusCode: status, timestamp: expect.any(Number) });
		expect(JSON.stringify((error as HttpException).getResponse())).not.toContain("SECRET");
	});

	it.each<[string, HttpException]>([
		["199", new HttpException("SECRET", 199)],
		["600", new HttpException("SECRET", 600)],
		["1000", new HttpException("SECRET", 1000)],
		["a fraction", new HttpException("SECRET", 404.5)],
		["NaN", new HttpException("SECRET", Number.NaN)],
		["a non-number", new HttpException("SECRET", "404" as unknown as number)],
		["1000 and an http-errors statusCode", Object.assign(new HttpException("SECRET", 1000), { expose: true, statusCode: 404 })],
	])("answers an HttpException with status %s as an unknown failure", async (_name: string, failure: HttpException) => {
		const logError = vi.spyOn(LoggerUtility.prototype, "error").mockImplementation(() => undefined);
		const { context } = buildContext({ "x-correlation-id": "corr-id" });
		const error: unknown = await lastValueFrom(new CorrelationIDResponseBodyInterceptor().intercept(context, { handle: () => throwError(() => failure) })).catch((caught: unknown) => caught);

		expect((error as HttpException).getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
		expect((error as HttpException).getResponse()).toEqual({ correlationID: "corr-id", error: "Internal Server Error", message: "Internal server error", statusCode: HttpStatus.INTERNAL_SERVER_ERROR, timestamp: expect.any(Number) });
		expect((error as HttpException).cause).toBe(failure);
		expect(logError).toHaveBeenCalledTimes(1);
	});

	it.each<[number, string]>([
		[200, "OK"],
		[302, "Found"],
		[599, "Error"],
	])("keeps the HttpException status %i as written", async (status: number, statusText: string) => {
		vi.spyOn(LoggerUtility.prototype, "error").mockImplementation(() => undefined);
		const { context } = buildContext({ "x-correlation-id": "corr-id" });
		const error: unknown = await lastValueFrom(new CorrelationIDResponseBodyInterceptor().intercept(context, { handle: () => throwError(() => new HttpException("written", status)) })).catch((caught: unknown) => caught);

		expect((error as HttpException).getStatus()).toBe(status);
		expect((error as HttpException).getResponse()).toEqual({ correlationID: "corr-id", error: statusText, message: "written", statusCode: status, timestamp: expect.any(Number) });
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

	it("ignores a repeated correlation header, generates an ID and preserves object response fields", async () => {
		const interceptor = new CorrelationIDResponseBodyInterceptor();
		const { context, reply, request } = buildContext({ "x-correlation-id": ["first-corr", "array-corr"] });
		const handler: CallHandler = {
			handle: () => throwError(() => new HttpException({ message: "bad", statusCode: HttpStatus.BAD_REQUEST }, HttpStatus.BAD_REQUEST)),
		};
		const rejection: unknown = await lastValueFrom(interceptor.intercept(context, handler)).then(
			() => undefined,
			(error: unknown) => error,
		);

		expect(rejection).toBeInstanceOf(HttpException);
		expect((rejection as HttpException).getResponse()).toEqual(
			expect.objectContaining({
				correlationID: expect.stringMatching(UUID_PATTERN),
				message: "bad",
				statusCode: HttpStatus.BAD_REQUEST,
				timestamp: expect.any(Number),
			}),
		);
		expect(reply.header).toHaveBeenCalledWith("x-correlation-id", ((rejection as HttpException).getResponse() as { correlationID: string }).correlationID);
		expect(request.headers["x-correlation-id"]).toBe(((rejection as HttpException).getResponse() as { correlationID: string }).correlationID);
		expect((request as { correlationID?: string }).correlationID).toBe(request.headers["x-correlation-id"]);
	});

	describe("client correlation ID bounds", () => {
		const resolveCorrelationId = async (header: Array<string> | string | undefined): Promise<{ body: string; header: string; request: string; requestHeader: unknown }> => {
			const interceptor = new CorrelationIDResponseBodyInterceptor();
			const { context, reply, request } = buildContext({ "x-correlation-id": header });
			const handler: CallHandler = {
				handle: () => throwError(() => new BadRequestException("bad")),
			};
			const rejection: unknown = await lastValueFrom(interceptor.intercept(context, handler)).then(
				() => undefined,
				(error: unknown) => error,
			);

			expect(rejection).toBeInstanceOf(HttpException);
			expect(reply.header).toHaveBeenCalledTimes(1);

			return {
				body: ((rejection as HttpException).getResponse() as { correlationID: string }).correlationID,
				header: reply.header.mock.calls[0]?.[1] as string,
				request: (request as { correlationID?: string }).correlationID as string,
				requestHeader: request.headers["x-correlation-id"],
			};
		};

		it.each([
			["1 character", "a"],
			["128 characters", "a".repeat(128)],
			["every allowed character", "AZaz09._:-"],
			["a UUID", "3f2504e0-4f89-41d3-9a0c-0305e82c3301"],
		])("accepts %s and answers it in the header and the body", async (_label: string, value: string) => {
			const resolved = await resolveCorrelationId(value);

			expect(resolved).toEqual({ body: value, header: value, request: value, requestHeader: value });
		});

		it.each([
			["0 characters", ""],
			["129 characters", "a".repeat(129)],
			["9000 bytes", "a".repeat(9000)],
			["a space", "corr id"],
			["leading whitespace", " corr-id"],
			["a slash", "corr/id"],
			["a comma from a joined repeated header", "first, second"],
			["a quote", 'corr"id'],
			["a non-ASCII letter", "corr-ïd"],
			["a control character", "corr\tid"],
			["an array header", ["corr-id", "other-id"]],
			["an array header with one valid value", ["corr-id"]],
		])("ignores %s and answers one generated ID in the header and the body", async (_label: string, value: Array<string> | string) => {
			const resolved = await resolveCorrelationId(value);

			expect(resolved.body).toMatch(UUID_PATTERN);
			expect(resolved).toEqual({ body: resolved.body, header: resolved.body, request: resolved.body, requestHeader: resolved.body });
		});

		it("generates an ID when the header is missing", async () => {
			const resolved = await resolveCorrelationId(undefined);

			expect(resolved.body).toMatch(UUID_PATTERN);
			expect(resolved).toEqual({ body: resolved.body, header: resolved.body, request: resolved.body, requestHeader: resolved.body });
		});
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
					error: "Internal Server Error",
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

		it("keeps a ThrottlerException as cause and answers it with the contract body", async () => {
			const failure = new ThrottlerException("rate limited");

			const exception = await interceptFailure(failure);

			expect(exception.cause).toBe(failure);
			expect(exception.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
			expect(JSON.stringify(exception.getResponse())).toBe(`{"message":"rate limited","error":"Too Many Requests","statusCode":429,"correlationID":"${correlationId}","timestamp":${timestamp}}`);
			expect(warningLog).toHaveBeenCalledTimes(1);
			expect(errorLog).not.toHaveBeenCalled();
		});

		it("keeps an HttpException with a string response as cause and completes its body with the contract fields", async () => {
			const failure = new HttpException("bad", HttpStatus.BAD_REQUEST);

			const exception = await interceptFailure(failure);

			expect(exception.cause).toBe(failure);
			expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
			expect(JSON.stringify(exception.getResponse())).toBe(`{"message":"bad","error":"Bad Request","statusCode":400,"correlationID":"${correlationId}","timestamp":${timestamp}}`);
			expect(errorLog).not.toHaveBeenCalled();
		});

		it("keeps an HttpException with an object response as cause and leaves its own cause reachable", async () => {
			const rootCause = new Error("SECRET_ROOT_CAUSE");
			const failure = new BadRequestException("bad", { cause: rootCause });

			const exception = await interceptFailure(failure);

			expect(exception.cause).toBe(failure);
			expect((exception.cause as HttpException).cause).toBe(rootCause);
			expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
			expect(JSON.stringify(exception.getResponse())).toBe(`{"message":"bad","error":"Bad Request","statusCode":400,"correlationID":"${correlationId}","timestamp":${timestamp}}`);
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
			expect(JSON.stringify(exception.getResponse())).toBe(`{"message":"Internal server error","error":"Internal Server Error","statusCode":500,"correlationID":"${correlationId}","timestamp":${timestamp}}`);
			expect(errorLog.mock.calls).toEqual([[`HTTP ${HttpStatus.INTERNAL_SERVER_ERROR} errorType=Error`]]);
		});

		it("answers an Error that exposes getStatus as an unknown failure", async () => {
			const failure = Object.assign(new Error("gateway"), { getStatus: (): number => HttpStatus.BAD_GATEWAY });

			const exception = await interceptFailure(failure);

			expect(exception.cause).toBe(failure);
			expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
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
			expect(JSON.stringify(exception.getResponse())).toBe(`{"message":"Internal server error","error":"Internal Server Error","statusCode":500,"correlationID":"${correlationId}","timestamp":${timestamp}}`);
			expect(errorLog.mock.calls).toEqual([[`HTTP ${HttpStatus.INTERNAL_SERVER_ERROR} errorType=${errorType}`]]);
		});
	});
});
