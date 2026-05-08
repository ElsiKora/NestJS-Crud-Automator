import type { CallHandler, ExecutionContext } from "@nestjs/common";

import { CorrelationIDResponseBodyInterceptor } from "@interceptor/correlation-id-response-body.interceptor";
import { HttpException, HttpStatus } from "@nestjs/common";
import { ThrottlerException } from "@nestjs/throttler";
import { lastValueFrom, throwError } from "rxjs";
import { describe, expect, it, vi } from "vitest";

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
	});

	it("wraps unknown errors as internal server HttpException", async () => {
		const interceptor = new CorrelationIDResponseBodyInterceptor();
		const { context } = buildContext({});
		const handler: CallHandler = {
			handle: () => throwError(() => new Error("boom")),
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
	});
});
