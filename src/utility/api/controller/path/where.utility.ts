import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiControllerPathPlanParameter } from "@interface/class/api/controller/path";
import type { FindOptionsWhere } from "typeorm";

import { ApiRequestValidationException } from "@class/api/request-validation-exception.class";
import { API_CONTROLLER_CURSOR_TIMESTAMP_PATTERN } from "@constant/api-controller-cursor.constant";
import { PATH_PARAMETER_FAILURE_CONSTANT } from "@constant/path-parameter-failure.constant";
import { BadRequestException } from "@nestjs/common";
import { ApiControllerParametersCreateFailure } from "@utility/api/controller/parameters/create-failure.utility";

/**
 * Converts validated path parameters into a direct entity where clause.
 * @template E - Entity type owned by the generated route.
 * @param {Partial<E> | undefined} parameters - Transformed route parameter object.
 * @param {ReadonlyArray<IApiControllerPathPlanParameter>} mappings - Path parameters and the entity fields they address.
 * @param {ReadonlySet<string>} [instantFields] - Fields stored as a date and time, whose path value must name one exact instant.
 * @param {Record<string, unknown>} [rawParameters] - Parameters as the request path carries them.
 * @returns {FindOptionsWhere<E>} Where clause derived from the route path.
 * @throws {ApiRequestValidationException} With an `isDefined` failure, when a parameter is missing.
 * @throws {BadRequestException} When a date and time value is not canonical.
 */
export function ApiControllerPathWhere<E extends IApiBaseEntity>(parameters: Partial<E> | undefined, mappings: ReadonlyArray<IApiControllerPathPlanParameter>, instantFields?: ReadonlySet<string>, rawParameters?: Record<string, unknown>): FindOptionsWhere<E> {
	const parameterRecord: Record<string, unknown> = parameters ?? {};
	const where: Record<string, unknown> = {};

	for (const mapping of mappings) {
		const value: unknown = Object.hasOwn(parameterRecord, mapping.parameter) ? parameterRecord[mapping.parameter] : undefined;

		if (value === undefined || value === null) {
			throw new ApiRequestValidationException([ApiControllerParametersCreateFailure(mapping.parameter, PATH_PARAMETER_FAILURE_CONSTANT.MISSING_CONSTRAINT, `${mapping.parameter} should not be null or undefined`)]);
		}

		Object.defineProperty(where, mapping.field, {
			// eslint-disable-next-line @elsikora/typescript/naming-convention
			configurable: true,
			// eslint-disable-next-line @elsikora/typescript/naming-convention
			enumerable: true,
			value: instantFields?.has(mapping.field) ? readInstant(value, rawParameters?.[mapping.parameter]) : value,
			// eslint-disable-next-line @elsikora/typescript/naming-convention
			writable: true,
		});
	}

	return where as FindOptionsWhere<E>;
}

/**
 * Reads a path value of a date and time column. The canonical form is checked here, independently of the host validation pipe, because a parsed `Date` of any other form depends on the process time zone.
 * @param {unknown} value - Value the route parameters carry.
 * @param {unknown} rawValue - Value the request path carries, which is the one left to check once a pipe has converted the parameter.
 * @returns {Date} The exact instant the path names.
 * @throws {BadRequestException} When the value is not the canonical UTC millisecond form.
 */
function readInstant(value: unknown, rawValue: unknown): Date {
	const text: unknown = value instanceof Date ? rawValue : value;

	if (typeof text !== "string" || !API_CONTROLLER_CURSOR_TIMESTAMP_PATTERN.test(text)) {
		throw new BadRequestException("PARAMETERS_NOT_VALID");
	}

	const instant: Date = new Date(text);

	if (Number.isNaN(instant.getTime()) || instant.toISOString() !== text) {
		throw new BadRequestException("PARAMETERS_NOT_VALID");
	}

	return instant;
}
