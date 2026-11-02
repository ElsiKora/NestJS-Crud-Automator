import type { ArgumentsHost } from "@nestjs/common";
import type { HttpAdapterHost } from "@nestjs/core";

import { CorrelationIDResponseBodyExceptionFilter } from "@exception-filter/correlation-id-response-body.exception-filter";
import { ForbiddenException, HttpException, HttpStatus } from "@nestjs/common";
import { LoggerUtility } from "@utility/logger.utility";
import { afterEach, describe, expect, it, vi } from "vitest";

const buildAdapter = (isSent: boolean = false) => ({ isHeadersSent: vi.fn(() => isSent), reply: vi.fn(), setHeader: vi.fn() });

const buildHost = (type: string, response: unknown) => {
	const request = { headers: { "x-correlation-id": "corr-id" } };
	const getArgByIndex = vi.fn((index: number) => [request, response][index]);
	const host = { getArgByIndex, getType: () => type, switchToHttp: vi.fn() } as unknown as ArgumentsHost;

	return { getArgByIndex, host, request };
};

const buildFilter = (adapter: unknown): CorrelationIDResponseBodyExceptionFilter => new CorrelationIDResponseBodyExceptionFilter({ httpAdapter: adapter } as unknown as HttpAdapterHost);

describe("CorrelationIDResponseBodyExceptionFilter", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("answers through the HTTP adapter with the correlation contract", () => {
		const adapter = buildAdapter();
		const reply = { status: vi.fn() };
		const { host } = buildHost("http", reply);

		buildFilter(adapter).catch(new ForbiddenException(), host);

		expect(adapter.setHeader).toHaveBeenCalledWith(reply, "x-correlation-id", "corr-id");
		expect(adapter.reply).toHaveBeenCalledTimes(1);
		expect(adapter.reply).toHaveBeenCalledWith(reply, { correlationID: "corr-id", message: "Forbidden", statusCode: HttpStatus.FORBIDDEN, timestamp: expect.any(Number) }, HttpStatus.FORBIDDEN);
	});

	it.each([[199], [600], [1000], [404.5]])("answers an HttpException with status %d as an unknown failure", (status: number) => {
		const logError = vi.spyOn(LoggerUtility.prototype, "error").mockImplementation(() => undefined);
		const adapter = buildAdapter();
		const reply = { status: vi.fn() };
		const { host } = buildHost("http", reply);

		buildFilter(adapter).catch(new HttpException("SECRET", status), host);

		expect(adapter.reply).toHaveBeenCalledTimes(1);
		expect(adapter.reply).toHaveBeenCalledWith(reply, { correlationID: "corr-id", error: "Internal Server Error", message: "Internal server error", statusCode: HttpStatus.INTERNAL_SERVER_ERROR, timestamp: expect.any(Number) }, HttpStatus.INTERNAL_SERVER_ERROR);
		expect(logError).toHaveBeenCalledTimes(1);
	});

	it.each<[number, string]>([
		[200, "OK"],
		[302, "Found"],
		[599, "Error"],
	])("keeps the HttpException status %i as written", (status: number, statusText: string) => {
		vi.spyOn(LoggerUtility.prototype, "error").mockImplementation(() => undefined);
		const adapter = buildAdapter();
		const reply = { status: vi.fn() };
		const { host } = buildHost("http", reply);

		buildFilter(adapter).catch(new HttpException("written", status), host);

		expect(adapter.reply).toHaveBeenCalledWith(reply, { correlationID: "corr-id", error: statusText, message: "written", statusCode: status, timestamp: expect.any(Number) }, status);
	});

	it("writes the header on a native response and still replies through the adapter", () => {
		const adapter = buildAdapter();
		const nativeResponse = { headersSent: false, setHeader: vi.fn() };
		const { host } = buildHost("http", nativeResponse);

		buildFilter(adapter).catch(new ForbiddenException(), host);

		expect(nativeResponse.setHeader).toHaveBeenCalledWith("x-correlation-id", "corr-id");
		expect(adapter.setHeader).not.toHaveBeenCalled();
		expect(adapter.isHeadersSent).not.toHaveBeenCalled();
		expect(adapter.reply).toHaveBeenCalledWith(nativeResponse, expect.objectContaining({ statusCode: HttpStatus.FORBIDDEN }), HttpStatus.FORBIDDEN);
	});

	it("does not write to an adapter response that was already sent", () => {
		const adapter = buildAdapter(true);
		const { host } = buildHost("http", { status: vi.fn() });

		expect(() => buildFilter(adapter).catch(new ForbiddenException(), host)).not.toThrow();
		expect(adapter.reply).not.toHaveBeenCalled();
		expect(adapter.setHeader).not.toHaveBeenCalled();
	});

	it("ends a sent native response that was not finished, without writing to it", () => {
		const adapter = buildAdapter();
		const nativeResponse = { end: vi.fn(), headersSent: true, setHeader: vi.fn(), writableEnded: false };
		const { host } = buildHost("http", nativeResponse);

		buildFilter(adapter).catch(new ForbiddenException(), host);

		expect(nativeResponse.end).toHaveBeenCalledWith();
		expect(nativeResponse.setHeader).not.toHaveBeenCalled();
		expect(adapter.reply).not.toHaveBeenCalled();
	});

	it("leaves a finished native response alone", () => {
		const nativeResponse = { end: vi.fn(), headersSent: true, setHeader: vi.fn(), writableEnded: true };
		const { host } = buildHost("http", nativeResponse);

		buildFilter(buildAdapter()).catch(new ForbiddenException(), host);

		expect(nativeResponse.end).not.toHaveBeenCalled();
	});

	it.each([["rpc"], ["ws"], ["graphql"]])("returns nothing, touches nothing and warns once in a %s context", (type: string) => {
		const warningLog = vi.spyOn(LoggerUtility.prototype, "warn").mockImplementation(() => undefined);
		const adapter = buildAdapter();
		const { getArgByIndex, host } = buildHost(type, {});

		expect(buildFilter(adapter).catch(new ForbiddenException("SECRET_MESSAGE"), host)).toBeUndefined();
		expect(getArgByIndex).not.toHaveBeenCalled();
		expect(adapter.reply).not.toHaveBeenCalled();
		expect(warningLog.mock.calls).toEqual([[`Not an HTTP context (${type}): the failure gets no correlation contract`]]);
		expect(warningLog.mock.contexts[0]).toEqual(expect.objectContaining({ context: "NestJS-Crud-Automator/CorrelationIDResponseBodyExceptionFilter" }));
	});

	it("warns once per filter instance, not once per failure", () => {
		const warningLog = vi.spyOn(LoggerUtility.prototype, "warn").mockImplementation(() => undefined);
		const filter: CorrelationIDResponseBodyExceptionFilter = buildFilter(buildAdapter());

		for (const type of ["ws", "ws", "rpc", "ws", "ws"]) {
			filter.catch(new ForbiddenException(), buildHost(type, {}).host);
		}

		expect(warningLog.mock.calls).toEqual([["Not an HTTP context (ws): the failure gets no correlation contract"]]);
		buildFilter(buildAdapter()).catch(new ForbiddenException(), buildHost("ws", {}).host);
		expect(warningLog).toHaveBeenCalledTimes(2);
	});

	it("returns nothing and does not warn without an HTTP adapter", () => {
		const warningLog = vi.spyOn(LoggerUtility.prototype, "warn").mockImplementation(() => undefined);
		const { getArgByIndex, host } = buildHost("http", {});

		expect(buildFilter(undefined).catch(new ForbiddenException(), host)).toBeUndefined();
		expect(getArgByIndex).not.toHaveBeenCalled();
		expect(warningLog).not.toHaveBeenCalled();
	});
});
