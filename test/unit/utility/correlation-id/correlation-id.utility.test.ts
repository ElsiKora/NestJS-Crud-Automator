import type { ArgumentsHost } from "@nestjs/common";
import type { AbstractHttpAdapter, HttpAdapterHost } from "@nestjs/core";

import { BadRequestException, ForbiddenException, HttpException, HttpStatus } from "@nestjs/common";
import { ThrottlerException } from "@nestjs/throttler";
import { CorrelationIDBuildException } from "@utility/correlation-id/build-exception.utility";
import { CorrelationIDHttpHostIsSent, CorrelationIDHttpHostResolve } from "@utility/correlation-id/http-host.utility";
import { CorrelationIDNormalizeException } from "@utility/correlation-id/normalize-exception.utility";
import { CorrelationIDResolve } from "@utility/correlation-id/resolve.utility";
import type { LoggerUtility } from "@utility/logger.utility";
import { describe, expect, it, vi } from "vitest";

const buildLogger = () => ({ error: vi.fn(), warn: vi.fn() }) as unknown as LoggerUtility & { error: ReturnType<typeof vi.fn>; warn: ReturnType<typeof vi.fn> };

const buildAdapter = (isSent: boolean = false) => ({ isHeadersSent: vi.fn(() => isSent), reply: vi.fn(), setHeader: vi.fn() }) as unknown as AbstractHttpAdapter & { setHeader: ReturnType<typeof vi.fn> };

const buildHost = (type: string, headers: Record<string, unknown>, response: unknown = { status: vi.fn() }) => {
	const request = { headers };
	const getArgByIndex = vi.fn((index: number) => [request, response][index]);
	const host = { getArgByIndex, getType: () => type } as unknown as ArgumentsHost;

	return { getArgByIndex, host, request };
};

describe("CorrelationIDResolve", () => {
	it.each<[string, unknown, string | undefined]>([
		["1 character", "a", "a"],
		["128 characters", "a".repeat(128), "a".repeat(128)],
		["every allowed character", "AZaz09._:-", "AZaz09._:-"],
		["a generated UUID for an empty string", "", undefined],
		["a generated UUID for 129 characters", "a".repeat(129), undefined],
		["a generated UUID for a disallowed character", "corr/id", undefined],
		["a generated UUID for surrounding whitespace", "  corr-id  ", undefined],
		["a generated UUID for a trailing newline", "corr-id\n", undefined],
		["a generated UUID for an array", ["array-id", "other"], undefined],
		["a generated UUID for an array with one valid value", ["array-id"], undefined],
		["a generated UUID for a blank array", [" ", ""], undefined],
		["a generated UUID for a non-string value", 42, undefined],
		["a generated UUID for a missing header", undefined, undefined],
	])("resolves %s", (_name: string, header: unknown, expected: string | undefined) => {
		const request = { headers: { "x-correlation-id": header } } as unknown as { headers: Record<string, string> };
		const setHeader = vi.fn();
		const correlationId: string = CorrelationIDResolve(request, setHeader);

		if (expected) {
			expect(correlationId).toBe(expected);
		} else {
			expect(correlationId).toMatch(/^[0-9a-f-]{36}$/u);
		}

		expect(request.headers["x-correlation-id"]).toBe(correlationId);
		expect((request as { correlationID?: string }).correlationID).toBe(correlationId);
		expect(setHeader).toHaveBeenCalledWith(correlationId);
	});

	it("keeps the ID the first call resolved", () => {
		const request = { headers: {} };

		expect(CorrelationIDResolve(request, vi.fn())).toBe(CorrelationIDResolve(request, vi.fn()));
	});
});

describe("CorrelationIDHttpHostIsSent", () => {
	it("asks the adapter for an adapter response", () => {
		expect(CorrelationIDHttpHostIsSent(buildAdapter(true), { status: vi.fn() })).toBe(true);
		expect(CorrelationIDHttpHostIsSent(buildAdapter(false), { status: vi.fn() })).toBe(false);
	});

	it("reads headersSent of a native response", () => {
		const adapter = buildAdapter(true);

		expect(CorrelationIDHttpHostIsSent(adapter, { headersSent: false })).toBe(false);
		expect(CorrelationIDHttpHostIsSent(adapter, { headersSent: true })).toBe(true);
		expect(adapter.isHeadersSent).not.toHaveBeenCalled();
	});
});

describe("CorrelationIDHttpHostResolve", () => {
	it("writes the header through the adapter", () => {
		const adapter = buildAdapter();
		const response = { status: vi.fn() };
		const { host } = buildHost("http", { "x-correlation-id": "corr-id" }, response);

		expect(CorrelationIDHttpHostResolve(host, adapter)).toBe("corr-id");
		expect(adapter.setHeader).toHaveBeenCalledWith(response, "x-correlation-id", "corr-id");
	});

	it("writes one generated ID for a client ID the rule rejects", () => {
		const adapter = buildAdapter();
		const response = { status: vi.fn() };
		const { host } = buildHost("http", { "x-correlation-id": "a".repeat(129) }, response);
		const correlationId: string = CorrelationIDHttpHostResolve(host, adapter);

		expect(correlationId).toMatch(/^[0-9a-f-]{36}$/u);
		expect(adapter.setHeader).toHaveBeenCalledWith(response, "x-correlation-id", correlationId);
	});

	it("writes the header on a native response", () => {
		const adapter = buildAdapter();
		const response = { headersSent: false, setHeader: vi.fn() };
		const { host } = buildHost("http", { "x-correlation-id": "corr-id" }, response);

		expect(CorrelationIDHttpHostResolve(host, adapter)).toBe("corr-id");
		expect(response.setHeader).toHaveBeenCalledWith("x-correlation-id", "corr-id");
		expect(adapter.setHeader).not.toHaveBeenCalled();
	});

	it("writes no header to a sent response", () => {
		const adapter = buildAdapter(true);
		const { host, request } = buildHost("http", { "x-correlation-id": "corr-id" });

		expect(CorrelationIDHttpHostResolve(host, adapter)).toBe("corr-id");
		expect(adapter.setHeader).not.toHaveBeenCalled();
		expect((request as { correlationID?: string }).correlationID).toBe("corr-id");
	});

	it("keeps an ID the interceptor already wrote", () => {
		const { host, request } = buildHost("http", {});
		const correlationId: string = CorrelationIDResolve(request as { headers: Record<string, string> }, vi.fn());

		expect(CorrelationIDHttpHostResolve(host, buildAdapter())).toBe(correlationId);
	});

	it.each([["rpc"], ["ws"]])("generates an ID without touching the transport in a %s context", (type: string) => {
		const { getArgByIndex, host } = buildHost(type, { "x-correlation-id": "corr-id" });

		expect(CorrelationIDHttpHostResolve(host, buildAdapter())).toMatch(/^[0-9a-f-]{36}$/u);
		expect(getArgByIndex).not.toHaveBeenCalled();
	});

	it("generates an ID without an adapter", () => {
		const { getArgByIndex, host } = buildHost("http", { "x-correlation-id": "corr-id" });

		expect(CorrelationIDHttpHostResolve(host, undefined)).toMatch(/^[0-9a-f-]{36}$/u);
		expect(getArgByIndex).not.toHaveBeenCalled();
	});
});

describe("CorrelationIDBuildException", () => {
	it("returns an exception it built as is", () => {
		const logger = buildLogger();
		const built: HttpException = CorrelationIDBuildException(new BadRequestException(), "corr-id", logger);

		expect(CorrelationIDBuildException(built, "other-id", logger)).toBe(built);
	});

	it("processes an exception of the same shape it did not build", () => {
		const lookalike: BadRequestException = new BadRequestException({ correlationID: "consumer-owned", message: "bad", timestamp: 1 });
		const built: HttpException = CorrelationIDBuildException(lookalike, "corr-id", buildLogger());

		expect(built).not.toBe(lookalike);
		expect(built.cause).toBe(lookalike);
		expect(built.getResponse()).toEqual({ correlationID: "corr-id", error: "Bad Request", message: "bad", statusCode: HttpStatus.BAD_REQUEST, timestamp: expect.any(Number) });
		expect((built.getResponse() as { timestamp: number }).timestamp).not.toBe(1);
	});

	it("completes a string response with error and statusCode", () => {
		expect(JSON.stringify(CorrelationIDBuildException(new HttpException("bad", HttpStatus.CONFLICT), "corr-id", buildLogger()).getResponse())).toMatch(/^\{"message":"bad","error":"Conflict","statusCode":409,"correlationID":"corr-id","timestamp":\d+\}$/u);
	});

	it("answers an array response as the message", () => {
		expect(CorrelationIDBuildException(new HttpException(["a", "b"], HttpStatus.BAD_REQUEST), "corr-id", buildLogger()).getResponse()).toEqual({ correlationID: "corr-id", error: "Bad Request", message: ["a", "b"], statusCode: HttpStatus.BAD_REQUEST, timestamp: expect.any(Number) });
	});

	it("keeps the fields that have the contract type", () => {
		expect(CorrelationIDBuildException(new HttpException({ error: "CUSTOM_ERROR", extra: 1, message: ["m"], statusCode: 418 }, HttpStatus.I_AM_A_TEAPOT), "corr-id", buildLogger()).getResponse()).toEqual({ correlationID: "corr-id", error: "CUSTOM_ERROR", extra: 1, message: ["m"], statusCode: HttpStatus.I_AM_A_TEAPOT, timestamp: expect.any(Number) });
	});

	it.each<[string, Record<string, unknown>]>([
		["missing", {}],
		["null", { error: null, message: null, statusCode: null }],
		["of the wrong type", { error: 1, message: { text: "m" }, statusCode: "409" }],
		["a mixed message array and another status", { error: ["Conflict"], message: ["a", 1], statusCode: 400 }],
		["a fractional status", { statusCode: 409.5 }],
	])("replaces fields that are %s", (_name: string, response: Record<string, unknown>) => {
		expect(CorrelationIDBuildException(new HttpException(response, HttpStatus.CONFLICT), "corr-id", buildLogger()).getResponse()).toEqual({ correlationID: "corr-id", error: "Conflict", message: "Conflict", statusCode: HttpStatus.CONFLICT, timestamp: expect.any(Number) });
	});

	it("names a status Node does not know Error", () => {
		expect(CorrelationIDBuildException(new HttpException({}, 499), "corr-id", buildLogger()).getResponse()).toEqual({ correlationID: "corr-id", error: "Error", message: "Error", statusCode: 499, timestamp: expect.any(Number) });
	});

	it("answers a ThrottlerException with the contract body and warns through the given logger", () => {
		const logger = buildLogger();

		expect(JSON.stringify(CorrelationIDBuildException(new ThrottlerException(), "corr-id", logger).getResponse())).toMatch(/^\{"message":"ThrottlerException: Too Many Requests","error":"Too Many Requests","statusCode":429,"correlationID":"corr-id","timestamp":\d+\}$/u);
		expect(logger.warn).toHaveBeenCalledTimes(1);
		expect(logger.error).not.toHaveBeenCalled();
	});

	it.each<[string, Record<string, unknown>, number, Array<string> | string, string]>([
		["a client value without expose", { message: "No such customer: cus_SECRET", statusCode: HttpStatus.NOT_FOUND }, HttpStatus.NOT_FOUND, "Not Found", "Not Found"],
		["a client value with expose false", { expose: false, message: "SECRET", statusCode: HttpStatus.BAD_REQUEST }, HttpStatus.BAD_REQUEST, "Bad Request", "Bad Request"],
		["a client value with expose true", { expose: true, message: "Body is too large", statusCode: HttpStatus.PAYLOAD_TOO_LARGE }, HttpStatus.PAYLOAD_TOO_LARGE, "Body is too large", "Payload Too Large"],
		["a client value with a truthy expose that is not true", { expose: "yes", message: "SECRET", statusCode: HttpStatus.BAD_REQUEST }, HttpStatus.BAD_REQUEST, "Bad Request", "Bad Request"],
		["an exposed value with a message that is not a string", { expose: true, message: 42, statusCode: HttpStatus.BAD_REQUEST }, HttpStatus.BAD_REQUEST, "Bad Request", "Bad Request"],
		["an exposed value with an empty message, which is a string", { expose: true, message: "", statusCode: HttpStatus.CONFLICT }, HttpStatus.CONFLICT, "", "Conflict"],
		["a server value without expose", { message: "SECRET", statusCode: HttpStatus.BAD_GATEWAY }, HttpStatus.BAD_GATEWAY, "Bad Gateway", "Bad Gateway"],
		["a server value with expose true", { expose: true, message: "VISIBLE", statusCode: HttpStatus.BAD_GATEWAY }, HttpStatus.BAD_GATEWAY, "VISIBLE", "Bad Gateway"],
		["the lowest status", { statusCode: 400 }, 400, "Bad Request", "Bad Request"],
		["the highest status, which Node does not name", { expose: true, message: "VISIBLE", statusCode: 599 }, 599, "VISIBLE", "Error"],
	])("answers %s with its status", (_name: string, failure: Record<string, unknown>, status: number, message: Array<string> | string, errorText: string) => {
		const built: HttpException = CorrelationIDBuildException(Object.assign(new Error(), failure), "corr-id", buildLogger());

		expect(built.getStatus()).toBe(status);
		expect(built.getResponse()).toEqual({ correlationID: "corr-id", error: errorText, message, statusCode: status, timestamp: expect.any(Number) });
		expect(JSON.stringify(built.getResponse())).not.toContain("SECRET");
	});

	it("answers an exposed plain object without a message with the status text", () => {
		expect(CorrelationIDBuildException({ expose: true, statusCode: HttpStatus.CONFLICT }, "corr-id", buildLogger()).getResponse()).toEqual({ correlationID: "corr-id", error: "Conflict", message: "Conflict", statusCode: HttpStatus.CONFLICT, timestamp: expect.any(Number) });
	});

	it("keeps an http-errors value as cause and logs a server one once with bounded evidence", () => {
		const logger = buildLogger();
		const failure: Record<string, unknown> = { expose: true, message: "SECRET", statusCode: HttpStatus.BAD_GATEWAY };

		expect(CorrelationIDBuildException(failure, "corr-id", logger).cause).toBe(failure);
		expect(logger.error).toHaveBeenCalledTimes(1);
		expect(JSON.stringify(logger.error.mock.calls)).not.toContain("SECRET");
		CorrelationIDBuildException({ message: "x", statusCode: HttpStatus.BAD_REQUEST }, "corr-id", logger);
		expect(logger.error).toHaveBeenCalledTimes(1);
	});

	it.each<[string, unknown]>([
		["a string status", { expose: true, message: "SECRET", statusCode: "404" }],
		["a status of 1000", { expose: true, message: "SECRET", statusCode: 1000 }],
		["a status of 200", { expose: true, message: "SECRET", statusCode: 200 }],
		["a status of 302", { expose: true, message: "SECRET", statusCode: HttpStatus.FOUND }],
		["a status of 399", { expose: true, message: "SECRET", statusCode: 399 }],
		["a status of 600", { expose: true, message: "SECRET", statusCode: 600 }],
		["a fractional status", { expose: true, message: "SECRET", statusCode: 404.5 }],
		["a zero status", { message: "SECRET", statusCode: 0 }],
		["a missing status", { message: "SECRET" }],
		["a string", "SECRET"],
		["an Error that exposes getStatus", Object.assign(new Error("SECRET"), { getStatus: (): number => HttpStatus.BAD_GATEWAY })],
	])("answers a value with %s as an unknown failure", (_name: string, failure: unknown) => {
		const logger = buildLogger();
		const built: HttpException = CorrelationIDBuildException(failure, "corr-id", logger);

		expect(built.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
		expect(JSON.stringify(built.getResponse())).toMatch(/^\{"message":"Internal server error","error":"Internal Server Error","statusCode":500,"correlationID":"corr-id","timestamp":\d+\}$/u);
		expect(built.cause).toBe(failure);
		expect(logger.error).toHaveBeenCalledTimes(1);
		expect(JSON.stringify(logger.error.mock.calls)).not.toContain("SECRET");
	});

	it.each([[0], [""], [false], [null], [undefined]])("keeps the falsy thrown value %s as cause", (value: unknown) => {
		expect(CorrelationIDBuildException(value, "corr-id", buildLogger()).cause).toBe(value);
	});
});

describe("CorrelationIDNormalizeException", () => {
	it("resolves the ID from the HTTP request and writes the header through the adapter", () => {
		const adapter = buildAdapter();
		const response = { status: vi.fn() };
		const { host } = buildHost("http", { "x-correlation-id": "corr-id" }, response);
		const normalized: HttpException = CorrelationIDNormalizeException(new ForbiddenException(), host, { httpAdapter: adapter } as unknown as HttpAdapterHost);

		expect((normalized.getResponse() as { correlationID: string }).correlationID).toBe("corr-id");
		expect(adapter.setHeader).toHaveBeenCalledWith(response, "x-correlation-id", "corr-id");
	});

	it("applies the client ID rule and answers the same generated ID in the body and the header", () => {
		const adapter = buildAdapter();
		const response = { status: vi.fn() };
		const { host } = buildHost("http", { "x-correlation-id": "corr/id" }, response);
		const normalized: HttpException = CorrelationIDNormalizeException(new ForbiddenException(), host, { httpAdapter: adapter } as unknown as HttpAdapterHost);
		const { correlationID }: { correlationID: string } = normalized.getResponse() as { correlationID: string };

		expect(correlationID).toMatch(/^[0-9a-f-]{36}$/u);
		expect(adapter.setHeader).toHaveBeenCalledWith(response, "x-correlation-id", correlationID);
	});

	it("generates an ID without touching the transport outside HTTP", () => {
		const { getArgByIndex, host } = buildHost("rpc", {});

		expect((CorrelationIDNormalizeException(new ForbiddenException(), host, { httpAdapter: buildAdapter() } as unknown as HttpAdapterHost).getResponse() as { correlationID: string }).correlationID).toMatch(/^[0-9a-f-]{36}$/u);
		expect(getArgByIndex).not.toHaveBeenCalled();
	});
});
