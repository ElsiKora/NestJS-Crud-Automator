import type { IncomingMessage } from "node:http";

import { randomUUID } from "node:crypto";

import { CorrelationIDReadHeader } from "./read-header.utility";

/**
 * Resolves the request correlation ID and persists it on the request.
 * Repeating the call for the same request keeps the ID, because the first call writes it to the request header.
 * @param {Pick<IncomingMessage, "headers">} request - Request whose `x-correlation-id` header is read and written.
 * @param {(correlationId: string) => void} setHeader - Writes the resolved ID to the response header.
 * @returns {string} The accepted client ID, otherwise a generated UUID.
 */
export function CorrelationIDResolve(request: Pick<IncomingMessage, "headers">, setHeader: (correlationId: string) => void): string {
	const correlationId: string = CorrelationIDReadHeader(request.headers["x-correlation-id"]) ?? randomUUID();

	// Persist the resolved correlation ID for downstream loggers/middlewares
	(request.headers as unknown as Record<string, unknown>)["x-correlation-id"] = correlationId;
	(request as unknown as { correlationID?: string }).correlationID = correlationId;
	setHeader(correlationId);

	return correlationId;
}
