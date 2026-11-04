import type { Type } from "@nestjs/common";
import type { ValidationError } from "class-validator";

import { EApiDtoType } from "@enum/decorator/api";
import { BadRequestException } from "@nestjs/common";
import { ApiControllerGetListQueryGetPublishedNames } from "@utility/api/controller/get-list/query/get-published-names.utility";
import { ApiRouteValidationFlattenErrors } from "@utility/api/route/validation-flatten-errors.utility";
import { DtoRequestWireBindDto } from "@utility/dto/request-wire/bind/dto.utility";
import { ErrorException } from "@utility/error/exception.utility";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";

const PAGINATION_AND_ORDER_PROPERTIES: ReadonlyArray<string> = ["limit", "orderBy", "orderDirection", "page"];

/**
 * Validates a raw GET_LIST query against the route's QUERY DTO before any query runs, whether or not the host registers a ValidationPipe.
 * Any key the DTO does not publish is rejected, as typed plans reject any key outside the plan. A misspelled filter therefore never returns the unfiltered list.
 * Pagination and order take the DTO's converted values, including class defaults of a manual DTO. Filter values stay as sent, because the route's filter transform parses them by column kind when it builds the where.
 * @template Q - Query record type.
 * @param {Type<unknown>} dto - QUERY DTO of the route, generated or manual.
 * @param {Q} query - Raw query after route-before subscribers and QUERY transformers.
 * @returns {Promise<Q>} Query with validated pagination and order values.
 * @throws {BadRequestException} With the flattened class-validator messages, the same body a Nest `ValidationPipe` returns, when any value fails the DTO or a key is not published, an unpublished key reading `property <key> should not exist` first, as with `forbidNonWhitelisted`; with `ORDER_NOT_VALID` when only one of orderBy and orderDirection is set.
 */
export async function ApiControllerGetListQueryValidate<Q extends object>(dto: Type<unknown>, query: Q): Promise<Q> {
	// A query is text, so the DTO converts the canonical text of its number and boolean properties.
	DtoRequestWireBindDto(dto, EApiDtoType.QUERY, `the GET_LIST query of a route read with ${dto.name}`);

	const instance: unknown = plainToInstance(dto, query);

	if (typeof instance !== "object" || instance === null) {
		throw ErrorException("GET_LIST QUERY DTO must convert a query into an object");
	}

	const defaults: object = new dto() as object;

	// A property exposed under another query name converts to undefined when the query does not set it, which loses its class default.
	for (const property of PAGINATION_AND_ORDER_PROPERTIES) {
		if (Reflect.get(instance, property) === undefined && Reflect.get(defaults, property) !== undefined) {
			Reflect.set(instance, property, Reflect.get(defaults, property));
		}
	}

	// eslint-disable-next-line @elsikora/typescript/naming-convention
	const errors: Array<ValidationError> = await validate(instance, { forbidUnknownValues: false });
	const publishedPropertyNames: ReadonlySet<string> = ApiControllerGetListQueryGetPublishedNames(dto);

	const messages: Array<string> = Object.keys(query)
		.filter((key: string): boolean => !publishedPropertyNames.has(key))
		.map((key: string): string => `property ${key} should not exist`);

	messages.push(...ApiRouteValidationFlattenErrors(errors));

	if (messages.length > 0) {
		throw new BadRequestException(messages);
	}

	const validated: Q = { ...query };

	for (const property of PAGINATION_AND_ORDER_PROPERTIES) {
		const value: unknown = Reflect.get(instance, property);

		if (value !== undefined) {
			Reflect.set(validated, property, value);
		}
	}

	// A manual QUERY DTO has no pair check of its own; its class defaults count as sent.
	const orderBy: unknown = Reflect.get(validated, "orderBy");
	const orderDirection: unknown = Reflect.get(validated, "orderDirection");

	if ((orderBy === undefined) !== (orderDirection === undefined)) {
		throw new BadRequestException("ORDER_NOT_VALID");
	}

	return validated;
}
