import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiControllerParametersRule } from "@interface/class/api/controller/parameters-rule.interface";
import type { IApiEntityColumn } from "@interface/entity";
import type { Type } from "@nestjs/common";
import type { ValidationError } from "class-validator";

import { ApiRequestValidationException } from "@class/api/request-validation-exception.class";
import { PATH_PARAMETER_FAILURE_CONSTANT } from "@constant/path-parameter-failure.constant";
import { validate } from "class-validator";

import { ApiControllerParametersIsIntegerColumn } from "./column/numeric-type.utility";
import { ApiControllerParametersIsUuidColumn } from "./column/uuid-type.utility";
import { ApiControllerParametersConvert } from "./convert.utility";
import { ApiControllerParametersCreateFailure } from "./create-failure.utility";
import { ApiControllerParametersRouteDtoValidate } from "./route-dto.utility";

const CANONICAL_INTEGER_PATTERN: RegExp = /^(?:0|-?[1-9]\d*)$/;

/**
 * Validates route path values against the path value rule of the route before any query runs.
 * The rule DTO carries the validators of each column's described type, so a value that the column cannot hold is rejected here instead of reaching the database.
 * A configured PARAMETERS DTO then validates the converted values: it can reject more values, but it cannot accept a value the column rule rejects or change how a value is converted.
 * The rule of a custom route is the route's own PARAMETERS DTO instead, and that DTO decides how a value is converted.
 * @template E - Entity type owned by the route.
 * @param {IApiControllerParametersRule | Type<unknown>} rule - Path value rule of the route, or a single DTO built from the described column types.
 * @param {Partial<E> | undefined} parameters - Path values after route-before subscribers and PARAMETERS transformers.
 * @param {Record<string, unknown>} [sent] - Path values as the client sent them, whose letter case a host pipe may already have changed in `parameters`; `parameters` when omitted.
 * @returns {Promise<Partial<E>>} Path values converted to the described column types, such as a number for a NUMBER column.
 * @throws {ApiRequestValidationException} With the class-validator failures as they are, and the body a Nest `ValidationPipe` returns, when any path value fails its described type or the configured DTO.
 */
export async function ApiControllerParametersValidate<E extends IApiBaseEntity>(rule: IApiControllerParametersRule | Type<unknown>, parameters: Partial<E> | undefined, sent?: Record<string, unknown>): Promise<Partial<E>> {
	const { columns, configuredDto, dto, routeDtoProperties, uuidParameters }: IApiControllerParametersRule = typeof rule === "function" ? { dto: rule } : rule;
	const parameterRecord: Record<string, unknown> = parameters ?? {};
	const sentRecord: Record<string, unknown> = sent ?? parameterRecord;

	if (routeDtoProperties) {
		const values: Record<string, unknown> = await ApiControllerParametersRouteDtoValidate(dto, routeDtoProperties, parameterRecord);
		assertCanonicalText(columns, uuidParameters, sentRecord, values);

		return values as Partial<E>;
	}

	const instance: object = ApiControllerParametersConvert(dto, parameterRecord);
	const errors: Array<ValidationError> = await validate(instance);

	if (errors.length > 0) {
		throw new ApiRequestValidationException(errors);
	}

	const validated: Record<string, unknown> = {};

	for (const key of Object.keys(parameterRecord)) {
		Object.defineProperty(validated, key, {
			// eslint-disable-next-line @elsikora/typescript/naming-convention
			configurable: true,
			// eslint-disable-next-line @elsikora/typescript/naming-convention
			enumerable: true,
			value: Reflect.get(instance, key),
			// eslint-disable-next-line @elsikora/typescript/naming-convention
			writable: true,
		});
	}

	if (configuredDto) {
		// The configured DTO sees the converted values, and its own transformers do not change the values the route uses.
		const configuredErrors: Array<ValidationError> = await validate(ApiControllerParametersConvert(configuredDto, { ...validated }), {
			// eslint-disable-next-line @elsikora/typescript/naming-convention
			forbidUnknownValues: false,
		});

		if (configuredErrors.length > 0) {
			throw new ApiRequestValidationException(configuredErrors);
		}
	}

	assertCanonicalText(columns, uuidParameters, sentRecord, validated);

	return validated as Partial<E>;
}

/**
 * Refuses a text that a database reads as a key it does not spell canonically, because IAM compares text: `016` would pass a Deny on `16`, and an upper-case UUID a Deny on its lower-case form, and still find the row.
 * A value described as a number is already canonical; a text form stays legal for a bigint, where a JavaScript number would lose digits. A UUID is checked as sent, so it is refused rather than lower-cased, whether the route knows its column or only its DTO validates it as a UUID.
 * @param {ReadonlyMap<string, IApiEntityColumn<unknown>> | undefined} columns - The entity column of each path parameter.
 * @param {ReadonlySet<string> | undefined} uuidParameters - The path parameters a custom route DTO validates as a UUID.
 * @param {Record<string, unknown>} sent - Path values as sent.
 * @param {Record<string, unknown>} values - Converted path values.
 * @returns {void}
 * @throws {ApiRequestValidationException} When the text of an integer or UUID column is not canonical.
 */
function assertCanonicalText(columns: ReadonlyMap<string, IApiEntityColumn<unknown>> | undefined, uuidParameters: ReadonlySet<string> | undefined, sent: Record<string, unknown>, values: Record<string, unknown>): void {
	const failures: Array<ValidationError> = [];
	const refusedUuids: Set<string> = new Set<string>();

	for (const [parameter, column] of columns ?? []) {
		const value: unknown = values[parameter];
		const sentValue: unknown = sent[parameter];

		if (typeof value === "string" && ApiControllerParametersIsIntegerColumn(column.type) && !CANONICAL_INTEGER_PATTERN.test(value)) {
			failures.push(ApiControllerParametersCreateFailure(parameter, PATH_PARAMETER_FAILURE_CONSTANT.NOT_CANONICAL_CONSTRAINT, `${parameter} must be a decimal integer without leading zeros`));
		} else if (typeof sentValue === "string" && ApiControllerParametersIsUuidColumn(column) && sentValue !== sentValue.toLowerCase()) {
			refusedUuids.add(parameter);
			failures.push(ApiControllerParametersCreateFailure(parameter, PATH_PARAMETER_FAILURE_CONSTANT.NOT_CANONICAL_CONSTRAINT, `${parameter} must be a lower-case UUID`));
		}
	}

	for (const parameter of uuidParameters ?? []) {
		const sentValue: unknown = sent[parameter];

		if (!refusedUuids.has(parameter) && typeof sentValue === "string" && sentValue !== sentValue.toLowerCase()) {
			failures.push(ApiControllerParametersCreateFailure(parameter, PATH_PARAMETER_FAILURE_CONSTANT.NOT_CANONICAL_CONSTRAINT, `${parameter} must be a lower-case UUID`));
		}
	}

	if (failures.length > 0) {
		throw new ApiRequestValidationException(failures);
	}
}
