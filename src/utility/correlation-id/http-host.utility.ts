import type { IncomingMessage, ServerResponse } from "node:http";

import type { ArgumentsHost } from "@nestjs/common";
import type { AbstractHttpAdapter } from "@nestjs/core";

import { randomUUID } from "node:crypto";

import { CorrelationIDResolve } from "./resolve.utility";

/**
 * Checks whether the response of the current request was already sent.
 * Nest middleware receives the native response, which the HTTP adapter does not read, so it is checked directly.
 * @param {AbstractHttpAdapter} httpAdapter - The application HTTP adapter.
 * @param {unknown} response - The adapter response or the native response.
 * @returns {boolean} Whether the response headers were already sent.
 */
export function CorrelationIDHttpHostIsSent(httpAdapter: AbstractHttpAdapter, response: unknown): boolean {
	return isNativeResponse(response) ? response.headersSent : Boolean(httpAdapter.isHeadersSent(response));
}

/**
 * Resolves the correlation ID for a filter and writes the response header through the HTTP adapter.
 * Outside an HTTP context there is no request to correlate, so the ID is generated and nothing is written.
 * @param {ArgumentsHost} host - The filter arguments host.
 * @param {AbstractHttpAdapter} [httpAdapter] - The application HTTP adapter, absent outside an HTTP application.
 * @returns {string} The resolved correlation ID.
 */
export function CorrelationIDHttpHostResolve(host: ArgumentsHost, httpAdapter: AbstractHttpAdapter | undefined): string {
	if (host.getType() !== "http" || !httpAdapter) {
		return randomUUID();
	}

	const request: IncomingMessage = host.getArgByIndex<IncomingMessage>(0);
	const response: unknown = host.getArgByIndex<unknown>(1);

	return CorrelationIDResolve(request, (correlationId: string) => {
		if (CorrelationIDHttpHostIsSent(httpAdapter, response)) {
			return;
		}

		if (isNativeResponse(response)) {
			response.setHeader("x-correlation-id", correlationId);
		} else {
			httpAdapter.setHeader(response, "x-correlation-id", correlationId);
		}
	});
}

/**
 * Detects the native response the same way the Fastify adapter does.
 * @param {unknown} response - The adapter response or the native response.
 * @returns {boolean} Whether the response is a native Node.js response.
 */
function isNativeResponse(response: unknown): response is ServerResponse {
	return typeof response === "object" && response !== null && !("status" in response);
}
