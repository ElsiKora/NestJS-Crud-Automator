import type { Type } from "@nestjs/common";
import type { ClassConstructor } from "class-transformer";
import type { ValidationError } from "class-validator";

import { BadRequestException } from "@nestjs/common";
import { ApiRouteValidationFlattenErrors } from "@utility/api/route/validation-flatten-errors.utility";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";

const PAGINATION_AND_ORDER_PROPERTIES: ReadonlyArray<string> = ["limit", "orderBy", "orderDirection", "page"];

/**
 * Validates a raw GET_LIST query against the route's QUERY DTO before any query runs, whether or not the host registers a ValidationPipe.
 * Pagination and order take the DTO's converted values, including class defaults of a manual DTO. Filter values stay as sent, because the filter operators bind them as strings.
 * @template Q - Query record type.
 * @param {Type<unknown>} dto - QUERY DTO of the route, generated or manual.
 * @param {Q} query - Raw query after route-before subscribers and QUERY transformers.
 * @returns {Promise<Q>} Query with validated pagination and order values.
 * @throws {BadRequestException} With the flattened class-validator messages, the same body a Nest `ValidationPipe` returns, when any value fails the DTO.
 */
export async function ApiControllerGetListQueryValidate<Q extends object>(dto: Type<unknown>, query: Q): Promise<Q> {
	const instance: Record<string, unknown> = plainToInstance(dto as ClassConstructor<Record<string, unknown>>, query as Record<string, unknown>);
	// eslint-disable-next-line @elsikora/typescript/naming-convention
	const errors: Array<ValidationError> = await validate(instance, { forbidUnknownValues: false });

	if (errors.length > 0) {
		throw new BadRequestException(ApiRouteValidationFlattenErrors(errors));
	}

	const validated: Record<string, unknown> = { ...(query as Record<string, unknown>) };

	for (const property of PAGINATION_AND_ORDER_PROPERTIES) {
		if (instance[property] !== undefined) {
			validated[property] = instance[property];
		}
	}

	return validated as Q;
}
