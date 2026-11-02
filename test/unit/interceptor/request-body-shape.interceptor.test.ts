import type { CallHandler, ExecutionContext } from "@nestjs/common";

import { RequestBodyShapeInterceptor } from "@interceptor/request-body-shape.interceptor";
import { BadRequestException } from "@nestjs/common";
import { lastValueFrom, of } from "rxjs";
import { describe, expect, it, vi } from "vitest";

const buildContext = (body: unknown): ExecutionContext => ({ switchToHttp: () => ({ getRequest: () => ({ body }) }) }) as unknown as ExecutionContext;

describe("RequestBodyShapeInterceptor", () => {
	it("hands on to the next handler for a body within the limits", async () => {
		const handle: CallHandler["handle"] = vi.fn(() => of("result"));

		await expect(lastValueFrom(new RequestBodyShapeInterceptor().intercept(buildContext({ id: 1 }), { handle }))).resolves.toBe("result");
		expect(handle).toHaveBeenCalledTimes(1);
	});

	it("hands on to the next handler when the request has no body", async () => {
		const handle: CallHandler["handle"] = vi.fn(() => of("result"));

		await expect(lastValueFrom(new RequestBodyShapeInterceptor().intercept(buildContext(undefined), { handle }))).resolves.toBe("result");
	});

	it("does not reach the next handler for a body past the limits", () => {
		const handle: CallHandler["handle"] = vi.fn(() => of("result"));
		const wide: Record<string, number> = Object.fromEntries(Array.from({ length: 1001 }, (_item: unknown, index: number): [string, number] => [String(index), 0]));

		expect(() => new RequestBodyShapeInterceptor().intercept(buildContext(wide), { handle })).toThrow(BadRequestException);
		expect(handle).not.toHaveBeenCalled();
	});
});
