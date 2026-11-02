import type { OpenAPIObject } from "@nestjs/swagger";
import type { TSwaggerComponentSchema, TSwaggerSchemaObject } from "@type/swagger";

import { HttpStatus } from "@nestjs/common";
import { expect } from "vitest";

const NEST_REFERENCE_WRAPPER_KEYS: ReadonlySet<string> = new Set<string>(["allOf", "description", "nullable", "readOnly", "type"]);
const UUID_PATTERN: RegExp = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;

export interface IRelationReferenceSchemaChecker {
	expectWireMatchesSchema: (rawSchema: TSwaggerComponentSchema, value: unknown, location: string) => void;
	getItemProperties: (path: string, isList: boolean) => Record<string, TSwaggerComponentSchema>;
	getItemSchema: (path: string, isList: boolean) => TSwaggerSchemaObject;
	getResponseSchema: (path: string, isList: boolean, method?: "get" | "patch" | "post" | "put") => TSwaggerComponentSchema;
	resolveSchema: (schema: TSwaggerComponentSchema) => TSwaggerSchemaObject;
}

/**
 * Creates the OpenAPI readers and the wire validator over one document.
 * @param {OpenAPIObject} document - OpenAPI document of the application.
 * @returns {IRelationReferenceSchemaChecker} Readers and validator of that document.
 */
export function createRelationReferenceSchemaChecker(document: OpenAPIObject): IRelationReferenceSchemaChecker {
	/**
	 * Resolves a schema through $ref and the allOf forms Nest emits for a class property, `{ type: "object", nullable: true, allOf: [{ $ref }] }` and `{ nullable: false, allOf: [{ $ref }] }`, with description and readOnly next to them.
	 * Those forms keep property-level nullable. Any other allOf fails, so the validator cannot accept a schema that generators read differently.
	 * @param {TSwaggerComponentSchema} schema - Schema to resolve.
	 * @returns {TSwaggerSchemaObject} Resolved schema.
	 */
	const resolveSchema = (schema: TSwaggerComponentSchema): TSwaggerSchemaObject => {
		if ("$ref" in schema) {
			const name: string = schema.$ref.replace("#/components/schemas/", "");
			const target: TSwaggerComponentSchema | undefined = document.components?.schemas?.[name];

			expect(target, `component ${name}`).toBeDefined();

			return resolveSchema(target as TSwaggerComponentSchema);
		}

		if (!schema.allOf) {
			return schema;
		}

		const { allOf, ...rest } = schema;

		expect(allOf, `allOf form of ${JSON.stringify(schema)}`).toHaveLength(1);
		expect(allOf[0], `allOf member of ${JSON.stringify(schema)}`).toHaveProperty("$ref");
		expect(rest.type, `type next to allOf in ${JSON.stringify(schema)}`).toBe(rest.nullable === true ? "object" : undefined);
		expect(
			Object.keys(schema).filter((key: string): boolean => !NEST_REFERENCE_WRAPPER_KEYS.has(key)),
			`keys next to allOf in ${JSON.stringify(schema)}`,
		).toEqual([]);

		const target: TSwaggerSchemaObject = resolveSchema(allOf[0] as TSwaggerComponentSchema);

		expect(target.type, `component behind allOf in ${JSON.stringify(schema)}`).toBe("object");

		return { ...target, ...rest };
	};

	/**
	 * Asserts that a wire value is valid against its OpenAPI schema.
	 * Objects are closed: the serializer drops undeclared keys, so a key on the wire must be declared.
	 * @param {TSwaggerComponentSchema} rawSchema - Declared schema.
	 * @param {unknown} value - Wire value.
	 * @param {string} location - JSON path used in failure messages.
	 */
	const expectWireMatchesSchema = (rawSchema: TSwaggerComponentSchema, value: unknown, location: string): void => {
		const schema: TSwaggerSchemaObject = resolveSchema(rawSchema);

		if (value === null) {
			expect(schema.nullable, `${location} is null on the wire, so the schema must be nullable`).toBe(true);

			return;
		}

		if (schema.type === "array") {
			expect(Array.isArray(value), `${location} must be an array`).toBe(true);

			for (const [index, item] of (value as Array<unknown>).entries()) {
				expectWireMatchesSchema(schema.items as TSwaggerComponentSchema, item, `${location}[${index}]`);
			}

			return;
		}

		if (schema.type === "object" || schema.properties) {
			expect(value !== null && typeof value === "object" && !Array.isArray(value), `${location} must be an object, got ${JSON.stringify(value)}`).toBe(true);

			const properties: Record<string, TSwaggerComponentSchema> = (schema.properties ?? {}) as Record<string, TSwaggerComponentSchema>;

			for (const requiredKey of schema.required ?? []) {
				expect(Object.keys(value as object), `${location}.${requiredKey} is required by the schema`).toContain(requiredKey);
			}

			for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
				expect(Object.keys(properties), `${location}.${key} is on the wire but not in the schema`).toContain(key);
				expectWireMatchesSchema(properties[key] as TSwaggerComponentSchema, item, `${location}.${key}`);
			}

			return;
		}

		// Array decorators of the library describe string items by format and pattern without a type.
		if (schema.type === "string" || (schema.type === undefined && (schema.format !== undefined || schema.pattern !== undefined))) {
			expect(typeof value, `${location} must be a string`).toBe("string");

			if (schema.format === "uuid") {
				expect(value, `${location} must be a uuid`).toMatch(UUID_PATTERN);
			}

			return;
		}

		if (schema.type === "number" || schema.type === "integer") {
			expect(typeof value, `${location} must be a number`).toBe("number");

			return;
		}

		if (schema.type === "boolean") {
			expect(typeof value, `${location} must be a boolean`).toBe("boolean");

			return;
		}

		throw new Error(`${location}: unsupported schema ${JSON.stringify(schema)}`);
	};

	const getResponseSchema = (path: string, isList: boolean, method: "get" | "patch" | "post" | "put" = "get"): TSwaggerComponentSchema => {
		const pathKey: string | undefined = Object.keys(document.paths).find((candidate: string): boolean => (isList ? candidate === `/${path}` : candidate.startsWith(`/${path}/{`)));

		expect(pathKey, `OpenAPI path for /${path}`).toBeDefined();

		const status: HttpStatus = method === "post" ? HttpStatus.CREATED : HttpStatus.OK;
		const content: Record<string, { schema: TSwaggerComponentSchema }> | undefined = (document.paths[pathKey as string]?.[method]?.responses?.[String(status)] as { content?: Record<string, { schema: TSwaggerComponentSchema }> } | undefined)?.content;

		expect(content?.["application/json"]?.schema, `${method.toUpperCase()} /${path} ${status} response schema`).toBeDefined();

		return content?.["application/json"]?.schema as TSwaggerComponentSchema;
	};

	const getItemSchema = (path: string, isList: boolean): TSwaggerSchemaObject => {
		const response: TSwaggerSchemaObject = resolveSchema(getResponseSchema(path, isList));

		return isList ? resolveSchema((resolveSchema(response.properties?.items as TSwaggerComponentSchema).items ?? {}) as TSwaggerComponentSchema) : response;
	};

	const getItemProperties = (path: string, isList: boolean): Record<string, TSwaggerComponentSchema> => getItemSchema(path, isList).properties as Record<string, TSwaggerComponentSchema>;

	return { expectWireMatchesSchema, getItemProperties, getItemSchema, getResponseSchema, resolveSchema };
}
