import "reflect-metadata";

import { ApiPropertyBoolean } from "@decorator/api/property/boolean.decorator";
import { ApiPropertyNumber } from "@decorator/api/property/number.decorator";
import { ApiPropertyObject } from "@decorator/api/property/object.decorator";
import { ApiPropertyString } from "@decorator/api/property/string.decorator";
import { EApiDtoType, EApiPropertyNumberType, EApiPropertyStringType, EApiRouteType } from "@enum/decorator/api";
import { PickType } from "@nestjs/swagger";
import { DtoAutoContextPop, DtoAutoContextPush } from "@utility/dto/auto/context";
import { DtoRequestWireBindDto } from "@utility/dto/request-wire/bind";
import { plainToInstance } from "class-transformer";
import { defaultMetadataStorage } from "class-transformer/cjs/storage.js";
import { validateSync } from "class-validator";
import { describe, expect, it } from "vitest";

class RequestWireEntity {}

const COUNT_OPTIONS = { description: "count", entity: RequestWireEntity, exampleValue: 1, format: EApiPropertyNumberType.INTEGER, isRequired: false, maximum: 100, minimum: 0, multipleOf: 1 } as const;
const FLAG_OPTIONS = { description: "flag", entity: RequestWireEntity, isRequired: false } as const;

/**
 * Declares a fresh DTO class with an integer `count` and a boolean `flag`, so each test binds its own classes.
 * @returns {new () => { count?: unknown; flag?: unknown }} The class.
 */
function createScalarDto(): new () => { count?: unknown; flag?: unknown } {
	class ScalarDto {
		@ApiPropertyNumber(COUNT_OPTIONS)
		public count?: unknown;

		@ApiPropertyBoolean(FLAG_OPTIONS)
		public flag?: unknown;
	}

	return ScalarDto;
}

/**
 * Reads a plain object into a DTO and lists the failing properties.
 * @param {new () => object} dto - DTO class.
 * @param {Record<string, unknown>} plain - Request value.
 * @returns {{ errors: Array<string>; instance: Record<string, unknown> }} The instance and the failing properties.
 */
function read(dto: new () => object, plain: Record<string, unknown>): { errors: Array<string>; instance: Record<string, unknown> } {
	const instance: Record<string, unknown> = plainToInstance(dto, plain) as Record<string, unknown>;

	return { errors: validateSync(instance).map((error: { property: string }): string => error.property), instance };
}

describe("DtoRequestWireBindDto", () => {
	it("keeps text in a class no route has bound, as a JSON body reads it", () => {
		const dto: new () => object = createScalarDto();

		expect(read(dto, { count: "5", flag: "true" })).toEqual({ errors: ["count", "flag"], instance: { count: "5", flag: "true" } });
		expect(read(dto, { count: 5, flag: true })).toEqual({ errors: [], instance: { count: 5, flag: true } });
	});

	it.each([EApiDtoType.QUERY, EApiDtoType.PARAMETERS])("converts canonical text in a class bound as %s", (dtoType: EApiDtoType) => {
		const dto: new () => object = createScalarDto();

		DtoRequestWireBindDto(dto, dtoType, "a test route");

		expect(read(dto, { count: "5", flag: "false" })).toEqual({ errors: [], instance: { count: 5, flag: false } });
		expect(read(dto, { count: "05", flag: "no" }).errors).toEqual(["count", "flag"]);
	});

	it("keeps text in a class bound as BODY", () => {
		const dto: new () => object = createScalarDto();

		DtoRequestWireBindDto(dto, EApiDtoType.BODY, "a test route");

		expect(read(dto, { count: "5", flag: "true" }).errors).toEqual(["count", "flag"]);
	});

	it("converts inherited properties on the bound subclass only, so the parent stays a JSON body class", () => {
		const parent: new () => object = createScalarDto();

		class QueryDto extends parent {}

		DtoRequestWireBindDto(QueryDto, EApiDtoType.QUERY, "a test query");
		DtoRequestWireBindDto(parent, EApiDtoType.BODY, "a test body");

		expect(read(QueryDto, { count: "5" }).instance.count).toBe(5);
		expect(read(parent, { count: "5" }).errors).toEqual(["count"]);
	});

	it("converts the properties of a mapped type bound as a query", () => {
		const source: new () => object = createScalarDto();

		class PickedQueryDto extends PickType(source as new () => { count?: unknown; flag?: unknown }, ["count"] as const) {}

		DtoRequestWireBindDto(PickedQueryDto, EApiDtoType.QUERY, "a test query");

		expect(read(PickedQueryDto, { count: "5" }).instance.count).toBe(5);
		expect(read(source, { count: "5" }).errors).toEqual(["count"]);
	});

	it("follows nested DTOs: a query converts them, a body keeps their text", () => {
		const nestedQuery: new () => object = createScalarDto();
		const nestedBody: new () => object = createScalarDto();

		class QueryDto {
			@ApiPropertyObject({ description: "filter", entity: RequestWireEntity, isRequired: false, shouldValidateNested: true, type: nestedQuery })
			public filter?: object;
		}

		class BodyDto {
			@ApiPropertyObject({ description: "items", entity: RequestWireEntity, isArray: true, isRequired: false, isUniqueItems: false, maxItems: 5, minItems: 1, shouldValidateNested: true, type: nestedBody })
			public items?: Array<object>;
		}

		DtoRequestWireBindDto(QueryDto, EApiDtoType.QUERY, "a test query");
		DtoRequestWireBindDto(BodyDto, EApiDtoType.BODY, "a test body");

		expect(read(QueryDto, { filter: { count: "5" } })).toEqual({ errors: [], instance: { filter: expect.objectContaining({ count: 5 }) as unknown } });
		expect(read(BodyDto, { items: [{ count: 5 }, { count: "5" }] }).errors).toEqual(["items"]);
		expect(read(BodyDto, { items: [{ count: 5, flag: true }] }).errors).toEqual([]);
	});

	it("adds the conversion once however often a class is bound", () => {
		const dto: new () => object = createScalarDto();

		class QueryDto extends dto {}

		DtoRequestWireBindDto(QueryDto, EApiDtoType.QUERY, "a test query");
		DtoRequestWireBindDto(QueryDto, EApiDtoType.QUERY, "another test query");

		expect(defaultMetadataStorage._transformMetadatas.get(QueryDto)?.get("count")).toHaveLength(1);
		expect(read(QueryDto, { count: "5" }).instance.count).toBe(5);
	});

	it("converts a property of a generated QUERY or PARAMETERS DTO without a binding", () => {
		class GeneratedQueryDto {
			public count?: unknown;
		}

		DtoAutoContextPush(GeneratedQueryDto.prototype, EApiRouteType.GET_LIST, EApiDtoType.QUERY);

		try {
			ApiPropertyNumber(COUNT_OPTIONS)(GeneratedQueryDto.prototype, "count");
		} finally {
			DtoAutoContextPop(GeneratedQueryDto.prototype);
		}

		expect(read(GeneratedQueryDto, { count: "5" }).instance.count).toBe(5);
	});

	it.each([
		["a body, then a query", EApiDtoType.BODY, EApiDtoType.QUERY],
		["a query, then a body", EApiDtoType.QUERY, EApiDtoType.BODY],
		["a path, then a body", EApiDtoType.PARAMETERS, EApiDtoType.BODY],
	])("refuses one class read from %s", (_order: string, first: EApiDtoType, second: EApiDtoType) => {
		const dto: new () => object = createScalarDto();

		DtoRequestWireBindDto(dto, first, first === EApiDtoType.BODY ? "the body of route a" : "the query of route a");

		expect(() => {
			DtoRequestWireBindDto(dto, second, second === EApiDtoType.BODY ? "the body of route b" : "the query of route b");
		}).toThrow(/DTO ScalarDto is read from text in the query of route [ab] and from a JSON body in the body of route [ab]\. .* declare a separate DTO for each$/);
	});

	it("refuses a query class that a body class inherits from, which would inherit its conversion", () => {
		const parent: new () => object = createScalarDto();

		class BodyDto extends parent {}

		DtoRequestWireBindDto(parent, EApiDtoType.QUERY, "the query of route a");

		expect(() => {
			DtoRequestWireBindDto(BodyDto, EApiDtoType.BODY, "the body of route b");
		}).toThrow("DTO ScalarDto is read from text in the query of route a and from a JSON body in the body of route b");
	});

	it("lets a class without number or boolean properties serve a body and a query", () => {
		class TextDto {
			@ApiPropertyString({ description: "name", entity: RequestWireEntity, exampleValue: "a", format: EApiPropertyStringType.STRING, isRequired: false, maxLength: 5, minLength: 1, pattern: "/^.+$/" })
			public name?: string;
		}

		DtoRequestWireBindDto(TextDto, EApiDtoType.BODY, "the body of route a");

		expect(() => {
			DtoRequestWireBindDto(TextDto, EApiDtoType.QUERY, "the query of route b");
		}).not.toThrow();
	});

	it.each([Object, String, Number, undefined, "text"])("ignores %s, which is no DTO class", (value: unknown) => {
		expect(() => {
			DtoRequestWireBindDto(value, EApiDtoType.QUERY, "a test query");
		}).not.toThrow();
	});
});
