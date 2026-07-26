import type { Type } from "@nestjs/common";
import type { SchemaObject } from "@nestjs/swagger/dist/interfaces/open-api-spec.interface";
import type { TApiRouteDiscriminatedDtoProperties } from "@type/decorator/api/route";

import { getSchemaPath } from "@nestjs/swagger";
import { ApiRouteValidateDiscriminatedDtoProperties } from "@utility/api/route/discriminator/validate-dto-properties.utility";

/**
 * Builds an OpenAPI oneOf schema with discriminator metadata for route-level DTO variants.
 * @param {TApiRouteDiscriminatedDtoProperties} properties - Route-level discriminated DTO config.
 * @param {string} context - Error message context.
 * @returns {SchemaObject} OpenAPI schema for a discriminated root DTO.
 */
export function ApiRouteBuildDiscriminatedDtoOpenApiSchema(properties: TApiRouteDiscriminatedDtoProperties, context: string): SchemaObject {
	ApiRouteValidateDiscriminatedDtoProperties(properties, context);

	return {
		discriminator: {
			mapping: Object.fromEntries(Object.entries(properties.discriminator.mapping).map(([key, value]: [string, Type<unknown>]): [string, string] => [key, getSchemaPath(value)])),
			propertyName: properties.discriminator.propertyName,
		},
		oneOf: properties.type.map((type: Type<unknown>): { $ref: string } => {
			return { $ref: getSchemaPath(type) };
		}),
	};
}
