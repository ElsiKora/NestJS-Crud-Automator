import type { TSwaggerSchemaObject } from "@type/swagger";

const BUILT_IN_RESPONSE_TYPES: ReadonlySet<unknown> = new Set<unknown>([Array, Boolean, Number, Object, String]);

/**
 * Builds the inline OpenAPI schema Swagger documents for a built-in response type, so a success response that carries its own content describes it the way `ApiResponse({ type })` does.
 * @param {unknown} type - Configured response type.
 * @returns {TSwaggerSchemaObject | undefined} Inline schema for `String`, `Number`, `Boolean`, `Object`, `Array`, `Date` and `BigInt`, or undefined for any other type.
 */
export function ApiRouteBuildBuiltInResponseOpenApiSchema(type: unknown): TSwaggerSchemaObject | undefined {
	if (type === Date) {
		return { format: "date-time", type: "string" };
	}

	if (type === BigInt) {
		return { format: "int64", type: "integer" };
	}

	if (typeof type === "function" && BUILT_IN_RESPONSE_TYPES.has(type)) {
		return { type: (type.name.charAt(0).toLowerCase() + type.name.slice(1)) as TSwaggerSchemaObject["type"] };
	}

	return undefined;
}
