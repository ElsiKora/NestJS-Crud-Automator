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
	});

	it("wraps ThrottlerException with correlation id", async () => {
		const interceptor = new CorrelationIDResponseBodyInterceptor();
		const { context } = buildContext({});
		const handler: CallHandler = {
			handle: () => throwError(() => new ThrottlerException("rate limited")),
		};

		await expect(lastValueFrom(interceptor.intercept(context, handler))).rejects.toBeInstanceOf(HttpException);
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
		}
	});
});
