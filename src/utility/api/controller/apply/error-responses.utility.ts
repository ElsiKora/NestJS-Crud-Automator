import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiRouteMetadata } from "@interface/decorator/api";

import { STATUS_CODES } from "node:http";

import { HttpStatus } from "@nestjs/common";
import { ApiResponse } from "@nestjs/swagger";
import { DtoGenerateException } from "@utility/dto/generate/exception.utility";
import { EnumIsValue } from "@utility/enum/is-value.utility";

// Statuses ApiMethod declares itself, on every route or from a response.errors flag
const API_METHOD_ERROR_STATUSES: ReadonlySet<number> = new Set<number>([HttpStatus.BAD_REQUEST, HttpStatus.CONFLICT, HttpStatus.FORBIDDEN, HttpStatus.INTERNAL_SERVER_ERROR, HttpStatus.NOT_FOUND, HttpStatus.PAYLOAD_TOO_LARGE, HttpStatus.TOO_MANY_REQUESTS, HttpStatus.UNAUTHORIZED, HttpStatus.UNSUPPORTED_MEDIA_TYPE]);

/**
 * Turns resolved error statuses into the `response.errors` flags `ApiMethod` reads.
 * @param {ReadonlyArray<number>} statuses - Resolved error statuses.
 * @returns {NonNullable<IApiRouteMetadata<IApiBaseEntity>["response"]>["errors"]} Response error flags.
 */
export function ApiControllerGetErrorFlags(statuses: ReadonlyArray<number>): NonNullable<IApiRouteMetadata<IApiBaseEntity>["response"]>["errors"] {
	return {
		hasConflict: statuses.includes(HttpStatus.CONFLICT),
		hasForbidden: statuses.includes(HttpStatus.FORBIDDEN),
		hasNotFound: statuses.includes(HttpStatus.NOT_FOUND),
		hasTooManyRequests: statuses.includes(HttpStatus.TOO_MANY_REQUESTS),
		hasUnauthorized: statuses.includes(HttpStatus.UNAUTHORIZED),
	};
}

/**
 * Declares the resolved statuses `ApiMethod` does not, such as a request validator answering 422, unless the route documents the status itself.
 * @param {ReadonlyArray<number>} statuses - Resolved error statuses.
 * @param {ReadonlyArray<{ status: unknown }>} [documented] - Responses the route documents itself.
 * @returns {Array<MethodDecorator>} Swagger response decorators.
 */
export function ApiControllerGetErrorResponseDecorators(statuses: ReadonlyArray<number>, documented: ReadonlyArray<{ status: unknown }> = []): Array<MethodDecorator> {
	const documentedStatuses: ReadonlySet<unknown> = new Set<unknown>(documented.map((response: { status: unknown }): unknown => response.status));

	return statuses.filter((status: number): status is HttpStatus => EnumIsValue(HttpStatus, status) && !API_METHOD_ERROR_STATUSES.has(status) && !documentedStatuses.has(status)).map((status: HttpStatus): MethodDecorator => ApiResponse({ description: STATUS_CODES[status] ?? HttpStatus[status], status, type: DtoGenerateException(status) }));
}
