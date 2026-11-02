import type { IApiControllerPropertiesRouteGetListResponseDtoConfig } from "@interface/decorator/api/controller/properties/route";
import type { Type } from "@nestjs/common";
import type { TSwaggerComponentSchema, TSwaggerSchemaObject } from "@type/swagger";

import { generateSchema } from "@nestjs/swagger";

type TListResponseDto = IApiControllerPropertiesRouteGetListResponseDtoConfig | ReadonlyArray<Type<unknown>> | Type<unknown>;

// A failed read is not kept, so the next one retries once the classes exist.
const PUBLISHED_FIELDS: WeakMap<object, ReadonlySet<string>> = new WeakMap<object, ReadonlySet<string>>();

/**
 * Lists the item properties a manual GET_LIST response DTO publishes in its OpenAPI schema.
 * A list wrapper class publishes the properties of its `items` element; an `itemType` config publishes the properties of that class; response variants publish the properties all of them publish.
 * Ordering is limited to these names, so a list is never ordered by a value its response leaves out. A wrapper without a resolvable `items` element publishes none.
 * A lazy type in the schema is evaluated here, so call this once the classes are loaded, not while a decorator runs.
 * @param {IApiControllerPropertiesRouteGetListResponseDtoConfig | ReadonlyArray<Type<unknown>> | Type<unknown>} responseDto - The configured GET_LIST RESPONSE DTO, item DTO config, or response variants.
 * @returns {ReadonlySet<string>} Item property names in the published schema.
 */
export function ApiControllerGetListResponsePublishedFields(responseDto: TListResponseDto): ReadonlySet<string> {
	const cachedFields: ReadonlySet<string> | undefined = PUBLISHED_FIELDS.get(responseDto);

	if (cachedFields) {
		return cachedFields;
	}

	const fields: ReadonlySet<string> = readPublishedFields(responseDto);

	PUBLISHED_FIELDS.set(responseDto, fields);

	return fields;
}

/**
 * Collects the property names a schema publishes for every value: its own properties and every `allOf` member's, plus the names all `oneOf`/`anyOf` variants share.
 * @param {TSwaggerComponentSchema} schema - Schema or reference to inspect.
 * @param {Record<string, TSwaggerSchemaObject>} schemas - Component schemas the references point to.
 * @returns {Set<string>} Published property names.
 */
function collectPropertyNames(schema: TSwaggerComponentSchema, schemas: Record<string, TSwaggerSchemaObject>): Set<string> {
	const resolved: TSwaggerSchemaObject | undefined = resolveSchema(schema, schemas);
	const names: Set<string> = new Set<string>(Object.keys(resolved?.properties ?? {}));

	for (const member of resolved?.allOf ?? []) {
		for (const name of collectPropertyNames(member, schemas)) {
			names.add(name);
		}
	}

	for (const variants of [resolved?.oneOf, resolved?.anyOf]) {
		if (variants && variants.length > 0) {
			const variantNames: Array<Set<string>> = variants.map((variant: TSwaggerComponentSchema): Set<string> => collectPropertyNames(variant, schemas));

			for (const name of variantNames[0] ?? []) {
				if (variantNames.every((candidate: Set<string>): boolean => candidate.has(name))) {
					names.add(name);
				}
			}
		}
	}

	return names;
}

/**
 * Tells response variants from a single response DTO.
 * @param {IApiControllerPropertiesRouteGetListResponseDtoConfig | ReadonlyArray<Type<unknown>> | Type<unknown>} responseDto - The response configuration.
 * @returns {boolean} True for response variants.
 */
function isResponseVariants(responseDto: TListResponseDto): responseDto is ReadonlyArray<Type<unknown>> {
	return Array.isArray(responseDto);
}

/**
 * Reads the property names of a list response schema, evaluating every lazy type the schema reaches, so it needs the classes those types name to exist.
 * @param {IApiControllerPropertiesRouteGetListResponseDtoConfig | ReadonlyArray<Type<unknown>> | Type<unknown>} responseDto - The configured GET_LIST RESPONSE DTO, item DTO config, or response variants.
 * @returns {ReadonlySet<string>} Item property names in the published schema.
 */
function readPublishedFields(responseDto: TListResponseDto): ReadonlySet<string> {
	if (isResponseVariants(responseDto)) {
		const variantFields: Array<ReadonlySet<string>> = responseDto.map((variant: Type<unknown>): ReadonlySet<string> => ApiControllerGetListResponsePublishedFields(variant));

		return new Set<string>([...(variantFields[0] ?? [])].filter((name: string): boolean => variantFields.every((fields: ReadonlySet<string>): boolean => fields.has(name))));
	}

	if (typeof responseDto === "object") {
		const { schema, schemas }: { schema: TSwaggerSchemaObject; schemas: Record<string, TSwaggerSchemaObject> } = generateSchema(responseDto.itemType);

		return collectPropertyNames(schema, schemas);
	}

	const { schema, schemas }: { schema: TSwaggerSchemaObject; schemas: Record<string, TSwaggerSchemaObject> } = generateSchema(responseDto);
	const items: TSwaggerComponentSchema | undefined = resolveSchema(schema, schemas)?.properties?.items;
	const resolvedItems: TSwaggerSchemaObject | undefined = items ? resolveSchema(items, schemas) : undefined;
	const element: TSwaggerComponentSchema | undefined = resolvedItems?.type === "array" ? resolvedItems.items : resolvedItems;

	return element ? collectPropertyNames(element, schemas) : new Set<string>();
}

/**
 * Follows a component reference to its schema.
 * @param {TSwaggerComponentSchema} schema - Schema or reference.
 * @param {Record<string, TSwaggerSchemaObject>} schemas - Component schemas the references point to.
 * @returns {TSwaggerSchemaObject | undefined} The referenced or given schema, or undefined for an unknown reference.
 */
function resolveSchema(schema: TSwaggerComponentSchema, schemas: Record<string, TSwaggerSchemaObject>): TSwaggerSchemaObject | undefined {
	if ("$ref" in schema) {
		return schemas[schema.$ref.split("/").at(-1) ?? ""];
	}

	return schema;
}
