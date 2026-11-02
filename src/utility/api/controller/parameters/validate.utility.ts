import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiControllerParametersRule } from "@interface/class/api/controller/parameters-rule.interface";
import type { Type } from "@nestjs/common";
import type { ValidationError } from "class-validator";

import { BadRequestException } from "@nestjs/common";
import { ApiRouteValidationFlattenErrors } from "@utility/api/route/validation-flatten-errors.utility";
import { validate } from "class-validator";

import { ApiControllerParametersConvert } from "./convert.utility";
import { ApiControllerParametersRouteDtoValidate } from "./route-dto.utility";

/**
 * Validates route path values against the path value rule of the route before any query runs.
 * The rule DTO carries the validators of each column's described type, so a value that the column cannot hold is rejected here instead of reaching the database.
 * A configured PARAMETERS DTO then validates the converted values: it can reject more values, but it cannot accept a value the column rule rejects or change how a value is converted.
 * The rule of a custom route is the route's own PARAMETERS DTO instead, and that DTO decides how a value is converted.
 * @template E - Entity type owned by the route.
 * @param {IApiControllerParametersRule | Type<unknown>} rule - Path value rule of the route, or a single DTO built from the described column types.
 * @param {Partial<E> | undefined} parameters - Path values after route-before subscribers and PARAMETERS transformers.
 * @returns {Promise<Partial<E>>} Path values converted to the described column types, such as a number for a NUMBER column.
 * @throws {BadRequestException} With the flattened class-validator messages, the same body a Nest `ValidationPipe` returns, when any path value fails its described type or the configured DTO.
 */
export async function ApiControllerParametersValidate<E extends IApiBaseEntity>(rule: IApiControllerParametersRule | Type<unknown>, parameters: Partial<E> | undefined): Promise<Partial<E>> {
	const { configuredDto, dto, routeDtoProperties }: IApiControllerParametersRule = typeof rule === "function" ? { dto: rule } : rule;
	const parameterRecord: Record<string, unknown> = parameters ?? {};

	if (routeDtoProperties) {
		return (await ApiControllerParametersRouteDtoValidate(dto, routeDtoProperties, parameterRecord)) as Partial<E>;
	}

	const instance: object = ApiControllerParametersConvert(dto, parameterRecord);
	const errors: Array<ValidationError> = await validate(instance);

	if (errors.length > 0) {
		throw new BadRequestException(ApiRouteValidationFlattenErrors(errors));
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
			throw new BadRequestException(ApiRouteValidationFlattenErrors(configuredErrors));
		}
	}

	return validated as Partial<E>;
}
