import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { Type } from "@nestjs/common";
import type { ClassConstructor } from "class-transformer";
import type { ValidationError } from "class-validator";

import { BadRequestException } from "@nestjs/common";
import { ApiRouteValidationFlattenErrors } from "@utility/api/route/validation-flatten-errors.utility";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";

/**
 * Validates route path values against the generated PARAMETERS DTO before any query runs.
 * The DTO carries the validators of each column's described type, so a value that the column cannot hold is rejected here instead of reaching the database.
 * @template E - Entity type owned by the generated route.
 * @param {Type<unknown>} dto - Generated PARAMETERS DTO of the route.
 * @param {Partial<E> | undefined} parameters - Path values after route-before subscribers and PARAMETERS transformers.
 * @returns {Promise<Partial<E>>} Path values converted to the described column types, such as a number for a NUMBER column.
 * @throws {BadRequestException} With the flattened class-validator messages, the same body a Nest `ValidationPipe` returns, when any path value fails its described type.
 */
export async function ApiControllerParametersValidate<E extends IApiBaseEntity>(dto: Type<unknown>, parameters: Partial<E> | undefined): Promise<Partial<E>> {
	const parameterRecord: Record<string, unknown> = parameters ?? {};
	const instance: Record<string, unknown> = plainToInstance(dto as ClassConstructor<Record<string, unknown>>, parameterRecord);
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
			value: instance[key],
			// eslint-disable-next-line @elsikora/typescript/naming-convention
			writable: true,
		});
	}

	return validated as Partial<E>;
}
