import type { Type } from "@nestjs/common";
import type { ValidationError } from "class-validator";

import { BadRequestException } from "@nestjs/common";
import { ApiRouteValidationFlattenErrors } from "@utility/api/route/validation-flatten-errors.utility";
import { ErrorException } from "@utility/error/exception.utility";
import { plainToInstance } from "class-transformer";
import { getMetadataStorage, validate } from "class-validator";

const FILTER_GROUP_KEY_PATTERN: RegExp = /^.+\[(?:operator|value|values)\]$/u;

const PAGINATION_AND_ORDER_PROPERTIES: ReadonlyArray<string> = ["limit", "orderBy", "orderDirection", "page"];

const PUBLISHED_PROPERTY_NAMES_BY_DTO: WeakMap<Type<unknown>, ReadonlySet<string>> = new WeakMap<Type<unknown>, ReadonlySet<string>>();

/**
 * Validates a raw GET_LIST query against the route's QUERY DTO before any query runs, whether or not the host registers a ValidationPipe.
 * A key shaped like a filter group (`<field>[operator]`, `<field>[value]` or `<field>[values]`) that the DTO does not publish is rejected, so a client never receives an unfiltered list for a filter it believes it applied. Other unknown keys are ignored, as a default ValidationPipe ignores them.
 * Pagination and order take the DTO's converted values, including class defaults of a manual DTO. Filter values stay as sent, because the route's filter transform parses them by column kind when it builds the where.
 * @template Q - Query record type.
 * @param {Type<unknown>} dto - QUERY DTO of the route, generated or manual.
 * @param {Q} query - Raw query after route-before subscribers and QUERY transformers.
 * @returns {Promise<Q>} Query with validated pagination and order values.
 * @throws {BadRequestException} With the flattened class-validator messages, the same body a Nest `ValidationPipe` returns, when any value fails the DTO or a filter group key is not published, an unpublished key reading `property <key> should not exist` first, as with `forbidNonWhitelisted`; with `ORDER_NOT_VALID` when only one of orderBy and orderDirection is set.
 */
export async function ApiControllerGetListQueryValidate<Q extends object>(dto: Type<unknown>, query: Q): Promise<Q> {
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
	const publishedPropertyNames: ReadonlySet<string> = getPublishedPropertyNames(dto);

	const messages: Array<string> = Object.keys(query)
		.filter((key: string): boolean => FILTER_GROUP_KEY_PATTERN.test(key) && !publishedPropertyNames.has(key))
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

/**
 * Resolves and caches the query keys a QUERY DTO publishes: properties with validation metadata, including inherited ones, and own properties of a new instance.
 * @param {Type<unknown>} dto - QUERY DTO of the route.
 * @returns {ReadonlySet<string>} Published property names.
 */
function getPublishedPropertyNames(dto: Type<unknown>): ReadonlySet<string> {
	const cachedPropertyNames: ReadonlySet<string> | undefined = PUBLISHED_PROPERTY_NAMES_BY_DTO.get(dto);

	if (cachedPropertyNames) {
		return cachedPropertyNames;
	}

	const publishedPropertyNames: ReadonlySet<string> = new Set<string>([
		...getMetadataStorage()
			.getTargetValidationMetadatas(dto, "", true, false)
			.map(({ propertyName }: { propertyName: string }): string => propertyName),
		...Object.keys(new dto() as object),
	]);

	PUBLISHED_PROPERTY_NAMES_BY_DTO.set(dto, publishedPropertyNames);

	return publishedPropertyNames;
}
