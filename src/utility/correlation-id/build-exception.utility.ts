import type { LoggerUtility } from "@utility/logger.utility";

import { STATUS_CODES } from "node:http";

import { HttpException, HttpStatus } from "@nestjs/common";
import { ThrottlerException } from "@nestjs/throttler";
import { FormatErrorEvidenceForLog } from "@utility/error/evidence-for-log.utility";

const MINIMUM_RESPONSE_STATUS: number = 200;

const MINIMUM_CLIENT_ERROR_STATUS: number = 400;

const MINIMUM_SERVER_ERROR_STATUS: number = 500;

const MAXIMUM_SERVER_ERROR_STATUS: number = 599;

const SANITIZED_MESSAGE: string = "Internal server error";

const builtExceptions: WeakSet<HttpException> = new WeakSet<HttpException>();

/**
 * Builds the HttpException that carries the correlation contract, keeping what it received as `cause`.
 * Every body has `correlationID`, `error`, `message`, `statusCode` and `timestamp`; a field the thrown value sets is kept only when it has the contract type.
 * The same value gives the same answer wherever it was thrown. An exception this function already built is returned as is, so a failure is never processed twice.
 * @param {unknown} error - The thrown value.
 * @param {string} correlationId - The resolved correlation ID.
 * @param {LoggerUtility} logger - Logger of the caller, for the bounded `429` and `5xx` lines.
 * @returns {HttpException} The exception to answer with.
 */
export function CorrelationIDBuildException(error: unknown, correlationId: string, logger: LoggerUtility): HttpException {
	if (error instanceof HttpException && builtExceptions.has(error)) {
		return error;
	}

	const exception: HttpException = buildException(error, correlationId, logger);

	builtExceptions.add(exception);

	return exception;
}

/**
 * Builds the response body with the correlation contract. A field keeps its value only when it has the contract type: `statusCode` equal to the response status, `message` a string or an array of strings, `error` a string.
 * @param {unknown} response - The exception response; a string, an array or any other value that is not an object becomes `message`.
 * @param {number} status - The response status.
 * @param {string} correlationId - The resolved correlation ID.
 * @returns {Record<string, unknown>} The response body.
 */
function buildBody(response: unknown, status: number, correlationId: string): Record<string, unknown> {
	const body: Record<string, unknown> = typeof response === "object" && response !== null && !Array.isArray(response) ? { ...response } : { message: response };

	if (!isMessage(body.message)) {
		body.message = getStatusText(status);
	}

	if (typeof body.error !== "string") {
		body.error = getStatusText(status);
	}

	if (body.statusCode !== status) {
		body.statusCode = status;
	}
	body.correlationID = correlationId;
	body.timestamp = Date.now();

	return body;
}

/**
 * Selects the response rule for the thrown value.
 * @param {unknown} error - The thrown value.
 * @param {string} correlationId - The resolved correlation ID.
 * @param {LoggerUtility} logger - Logger of the caller.
 * @returns {HttpException} The built exception.
 */
function buildException(error: unknown, correlationId: string, logger: LoggerUtility): HttpException {
	// A status outside the range cannot be answered, so that exception falls through to the unknown failure
	if (error instanceof HttpException && isResponseStatus(error.getStatus())) {
		const status: number = error.getStatus();

		if (error instanceof ThrottlerException) {
			logger.warn(`HTTP ${HttpStatus.TOO_MANY_REQUESTS} rateLimited`);
		} else if (status >= MINIMUM_SERVER_ERROR_STATUS) {
			logger.error(`HTTP ${status} ${FormatErrorEvidenceForLog(error)}`);
		}

		return new HttpException(buildBody(error.getResponse(), status, correlationId), status, { cause: error });
	}

	if (isHttpError(error)) {
		const status: number = error.statusCode;

		if (status >= MINIMUM_SERVER_ERROR_STATUS) {
			logger.error(`HTTP ${status} ${FormatErrorEvidenceForLog(error)}`);
		}

		// Only a value that marks its message as public sends it, so an upstream client error cannot leak through
		return new HttpException(buildBody({ message: error.expose === true ? error.message : undefined }, status, correlationId), status, { cause: error });
	}

	logger.error(`HTTP ${HttpStatus.INTERNAL_SERVER_ERROR} ${FormatErrorEvidenceForLog(error)}`);

	const exception: HttpException = new HttpException(buildBody({ message: SANITIZED_MESSAGE }, HttpStatus.INTERNAL_SERVER_ERROR, correlationId), HttpStatus.INTERNAL_SERVER_ERROR, { cause: error });

	// HttpException drops a falsy cause, and any value can be thrown
	exception.cause = error;

	return exception;
}

/**
 * Returns the status text Node `STATUS_CODES` gives the status, for the `error` and `message` fields that have no valid value.
 * @param {number} status - The response status.
 * @returns {string} The status text, or `Error` for a status Node does not name.
 */
function getStatusText(status: number): string {
	return STATUS_CODES[status] ?? "Error";
}

/**
 * Checks for an http-errors value, such as the Fastify error for a body that is too large: an object with an integer `statusCode` from 400 to 599 that is not an `HttpException`.
 * @param {unknown} error - The thrown value.
 * @returns {boolean} Whether the value is an http-errors value.
 */
function isHttpError(error: unknown): error is { expose?: unknown; message?: unknown; statusCode: number } {
	if (typeof error !== "object" || error === null || error instanceof HttpException) {
		return false;
	}

	const statusCode: unknown = (error as { statusCode?: unknown }).statusCode;

	return typeof statusCode === "number" && Number.isInteger(statusCode) && statusCode >= MINIMUM_CLIENT_ERROR_STATUS && statusCode <= MAXIMUM_SERVER_ERROR_STATUS;
}

/**
 * Checks that a body message has the contract type.
 * @param {unknown} message - The body message.
 * @returns {boolean} Whether the message is a string or an array of strings.
 */
function isMessage(message: unknown): message is Array<string> | string {
	return typeof message === "string" || (Array.isArray(message) && message.every((item: unknown) => typeof item === "string"));
}

/**
 * Checks that an `HttpException` status can be answered.
 * @param {number} status - The exception status.
 * @returns {boolean} Whether the status is an integer from 200 to 599.
 */
function isResponseStatus(status: number): boolean {
	return Number.isInteger(status) && status >= MINIMUM_RESPONSE_STATUS && status <= MAXIMUM_SERVER_ERROR_STATUS;
}
