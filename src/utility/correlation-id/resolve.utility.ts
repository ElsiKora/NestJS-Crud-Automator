import type { IncomingMessage } from "node:http";

import { randomUUID } from "node:crypto";

/**
 * Resolves the request correlation ID and persists it on the request.
 * Repeating the call for the same request keeps the ID, because the first call writes it to the request header.
 * @param {Pick<IncomingMessage, "headers">} request - Request whose `x-correlation-id` header is read and written.
 * @param {(correlationId: string) => void} setHeader - Writes the resolved ID to the response header.
 * @returns {string} The trimmed client header value, otherwise a generated UUID.
 */
export function CorrelationIDResolve(request: Pick<IncomingMessage, "headers">, setHeader: (correlationId: string) => void): string {
	const rawCorrelationId: Array<string> | string | undefined = request.headers["x-correlation-id"];

	const headerCorrelationId: string | undefined = Array.isArray(rawCorrelationId) ? rawCorrelationId.find((value: string) => value.trim().length > 0) : rawCorrelationId;
	const normalizedCorrelationId: string | undefined = typeof headerCorrelationId === "string" ? headerCorrelationId.trim() : undefined;
	const correlationId: string = normalizedCorrelationId && normalizedCorrelationId.length > 0 ? normalizedCorrelationId : randomUUID();

	// Persist the resolved correlation ID for downstream loggers/middlewares
	(request.headers as unknown as Record<string, unknown>)["x-correlation-id"] = correlationId;
	(request as unknown as { correlationID?: string }).correlationID = correlationId;
	setHeader(correlationId);

	return correlationId;
}
