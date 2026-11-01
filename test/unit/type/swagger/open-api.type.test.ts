import type { TSwaggerHeadersObject, TSwaggerReferenceObject, TSwaggerSchemaObject, TSwaggerSecurityRequirementObject } from "@type/swagger";

import { describe, expectTypeOf, it } from "vitest";

describe("swagger OpenAPI types", () => {
	it("derives the reference object without the schema branch", () => {
		expectTypeOf<TSwaggerReferenceObject>().toHaveProperty("$ref");
		expectTypeOf<TSwaggerReferenceObject>().not.toHaveProperty("properties");
	});

	it("derives the schema object without the reference branch", () => {
		expectTypeOf<TSwaggerSchemaObject>().toHaveProperty("properties");
		expectTypeOf<TSwaggerSchemaObject>().toHaveProperty("oneOf");
		expectTypeOf<TSwaggerSchemaObject>().not.toHaveProperty("$ref");
	});

	it("derives the headers map keyed by header name", () => {
		expectTypeOf<TSwaggerHeadersObject>().toEqualTypeOf<Record<string, TSwaggerHeadersObject[string]>>();
		expectTypeOf<TSwaggerReferenceObject>().toExtend<TSwaggerHeadersObject[string]>();
	});

	it("derives the security requirement as scheme names mapped to scopes", () => {
		expectTypeOf<TSwaggerSecurityRequirementObject>().toEqualTypeOf<Record<string, Array<string>>>();
	});
});
