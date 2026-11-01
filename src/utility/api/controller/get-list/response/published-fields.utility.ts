import type { IApiControllerPropertiesRouteGetListResponseDtoConfig } from "@interface/decorator/api/controller/properties/route";
import type { Type } from "@nestjs/common";
import type { TSwaggerComponentSchema, TSwaggerSchemaObject } from "@type/swagger";

import { generateSchema } from "@nestjs/swagger";

/**
 * Lists the item properties a manual GET_LIST response DTO publishes in its OpenAPI schema.
 * A list wrapper class publishes the properties of its `items` element; an `itemType` config publishes the properties of that class.
 * Ordering is limited to these names, so a list is never ordered by a value its response leaves out. A wrapper without a resolvable `items` element publishes none.
 * @param {IApiControllerPropertiesRouteGetListResponseDtoConfig | Type<unknown>} responseDto - The configured GET_LIST RESPONSE DTO or item DTO config.
 * @returns {ReadonlySet<string>} Item property names in the published schema.
 */
export function ApiControllerGetListResponsePublishedFields(responseDto: IApiControllerPropertiesRouteGetListResponseDtoConfig | Type<unknown>): ReadonlySet<string> {
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
