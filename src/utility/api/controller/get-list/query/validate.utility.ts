import type { Type } from "@nestjs/common";
import type { ValidationError } from "class-validator";

import { SWAGGER_METADATA_CONSTANT } from "@constant/swagger";
import { BadRequestException } from "@nestjs/common";
import { ApiRouteValidationFlattenErrors } from "@utility/api/route/validation-flatten-errors.utility";
import { ErrorException } from "@utility/error/exception.utility";
import { plainToInstance } from "class-transformer";
import { getMetadataStorage, validate } from "class-validator";

const PAGINATION_AND_ORDER_PROPERTIES: ReadonlyArray<string> = ["limit", "orderBy", "orderDirection", "page"];

const PUBLISHED_PROPERTY_NAMES_BY_DTO: WeakMap<Type<unknown>, ReadonlySet<string>> = new WeakMap<Type<unknown>, ReadonlySet<string>>();

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

/**
 * Reads the query keys a QUERY DTO exposes, such as `sort` for `@Expose({ name: "sort" }) orderBy`. class-transformer offers its expose metadata only through the keys it looks up while converting, so this converts an empty query and records them.
 * @param {Type<unknown>} dto - QUERY DTO of the route.
 * @returns {Array<string>} Exposed query keys.
 */
function getExposedQueryNames(dto: Type<unknown>): Array<string> {
	const exposedQueryNames: Array<string> = [];

	plainToInstance(
		dto,
		new Proxy<object>(
			{},
			{
				get: (target: object, key: string | symbol): unknown => {
					if (typeof key === "string") {
						exposedQueryNames.push(key);
					}

					return Reflect.get(target, key);
				},
			},
		),
	);

	return exposedQueryNames;
}

/**
 * Resolves and caches the query keys a QUERY DTO publishes: properties with validation or Swagger metadata, including inherited ones, own properties of a new instance, and names exposed with `@Expose`.
 * A member of the prototype chain, such as the `object` method that anchors the generated filter-pairing validator, is not a query key.
 * @param {Type<unknown>} dto - QUERY DTO of the route.
 * @returns {ReadonlySet<string>} Published property names.
 */
function getPublishedPropertyNames(dto: Type<unknown>): ReadonlySet<string> {
	const cachedPropertyNames: ReadonlySet<string> | undefined = PUBLISHED_PROPERTY_NAMES_BY_DTO.get(dto);

	if (cachedPropertyNames) {
		return cachedPropertyNames;
	}

	const instance: object = new dto() as object;
	const swaggerPropertyNames: Array<string> = ((Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES_ARRAY, dto.prototype as object) as Array<string> | undefined) ?? []).map((propertyName: string): string => propertyName.replace(/^:/u, ""));

	const candidateNames: Array<string> = [
		...getMetadataStorage()
			.getTargetValidationMetadatas(dto, "", true, false)
			.map(({ propertyName }: { propertyName: string }): string => propertyName),
		...swaggerPropertyNames,
		...getExposedQueryNames(dto),
	];
	const publishedPropertyNames: ReadonlySet<string> = new Set<string>([...candidateNames.filter((propertyName: string): boolean => !(propertyName in (dto.prototype as object))), ...Object.keys(instance)]);

	PUBLISHED_PROPERTY_NAMES_BY_DTO.set(dto, publishedPropertyNames);

	return publishedPropertyNames;
}
