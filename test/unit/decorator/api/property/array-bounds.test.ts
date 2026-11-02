import "reflect-metadata";

import { ApiPropertyBoolean } from "@decorator/api/property/boolean.decorator";
import { ApiPropertyDate } from "@decorator/api/property/date.decorator";
import { ApiPropertyEnum } from "@decorator/api/property/enum.decorator";
import { ApiPropertyNumber } from "@decorator/api/property/number.decorator";
import { ApiPropertyObject } from "@decorator/api/property/object.decorator";
import { ApiPropertyString } from "@decorator/api/property/string.decorator";
import { ApiPropertyUUID } from "@decorator/api/property/uuid.decorator";
import { EApiPropertyDateIdentifier, EApiPropertyDateType, EApiPropertyNumberType, EApiPropertyStringType } from "@enum/decorator/api";
import { Controller, Get } from "@nestjs/common";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { ApiOkResponse, DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Test } from "@nestjs/testing";
import { describe, expect, it } from "vitest";

class ArrayBoundsEntity {}

class ArrayBoundsChildDto {}

class ArrayBoundsDto {
	public items!: unknown;
}

const SHARED_OPTIONS: Record<string, unknown> = { description: "items", entity: ArrayBoundsEntity, isArray: true, isRequired: true };
const BOUNDS: Record<string, unknown> = { isUniqueItems: false, maxItems: 3, minItems: 1 };

const DECORATORS: Array<[string, (options: never) => PropertyDecorator, Record<string, unknown>]> = [
	["ApiPropertyBoolean", ApiPropertyBoolean, {}],
	["ApiPropertyDate", ApiPropertyDate, { format: EApiPropertyDateType.DATE_TIME, identifier: EApiPropertyDateIdentifier.DATE }],
	["ApiPropertyEnum", ApiPropertyEnum, { enum: { ACTIVE: "active" }, enumName: "ArrayBoundsStatus" }],
	["ApiPropertyNumber", ApiPropertyNumber, { exampleValue: [2], format: EApiPropertyNumberType.INTEGER, maximum: 10, minimum: 1, multipleOf: 1 }],
	["ApiPropertyObject", ApiPropertyObject, { shouldValidateNested: true, type: ArrayBoundsChildDto }],
	["ApiPropertyString", ApiPropertyString, { exampleValue: ["first"], format: EApiPropertyStringType.STRING, maxLength: 10, minLength: 1, pattern: "/^.+$/" }],
	["ApiPropertyUUID", ApiPropertyUUID, {}],
];

describe.each(DECORATORS)("%s array options at decoration", (name: string, decorator: (options: never) => PropertyDecorator, specificOptions: Record<string, unknown>) => {
	// Reflect.apply passes the options the way JavaScript or `any` would, past the property types.
	const decorate = (overrides: Record<string, unknown>): void => {
		const propertyDecorator: PropertyDecorator = Reflect.apply(decorator, undefined, [{ ...SHARED_OPTIONS, ...specificOptions, ...BOUNDS, ...overrides }]);

		propertyDecorator(ArrayBoundsDto.prototype, "items");
	};

	it("accepts a fully bounded request array", () => {
		expect(() => decorate({})).not.toThrow();
	});

	it("names the class, the property and each missing bound of a request array", () => {
		expect(() => decorate({ isUniqueItems: undefined, minItems: undefined })).toThrow(`${name} error: Request array property 'ArrayBoundsDto.items' must declare 'isUniqueItems', 'minItems', or be marked 'isResponse: true' if it is response-only`);
	});

	it.each([
		["false", false],
		["a truthy value that is not true", "true"],
	])("treats isResponse set to %s as a request", (_label: string, isResponse: unknown) => {
		expect(() => decorate({ isResponse, maxItems: undefined })).toThrow("must declare 'maxItems'");
	});

	it("lets a response array leave its bounds out", () => {
		expect(() => decorate({ isRequired: undefined, isResponse: true, isUniqueItems: undefined, maxItems: undefined, minItems: undefined })).not.toThrow();
	});

	it.each([
		["maxItems", Number.NaN],
		["maxItems", null],
		["maxItems", 1.5],
		["maxItems", "3"],
		["minItems", Number.POSITIVE_INFINITY],
		["minItems", null],
	])("rejects %s set to %s", (bound: string, value: unknown) => {
		expect(() => decorate({ [bound]: value })).toThrow(`${name} error: Property 'ArrayBoundsDto.items': '${bound}' must be a non-negative integer`);
	});

	it("rejects a bad bound on a response array too", () => {
		expect(() => decorate({ isRequired: undefined, isResponse: true, maxItems: Number.NaN })).toThrow(`${name} error: Property 'ArrayBoundsDto.items': 'maxItems' must be a non-negative integer`);
	});

	it("rejects isUniqueItems that is not a boolean", () => {
		expect(() => decorate({ isUniqueItems: null })).toThrow(`${name} error: Property 'ArrayBoundsDto.items': 'isUniqueItems' must be a boolean`);
	});

	it.each([
		["a number", 1],
		["a string", "true"],
		["null", null],
	])("rejects isArray set to %s", (_label: string, isArray: unknown) => {
		expect(() => decorate({ isArray, maxItems: Number.NaN })).toThrow(`${name} error: Property 'ArrayBoundsDto.items': 'isArray' must be a boolean`);
	});

	it("keeps the size errors for valid numbers", () => {
		expect(() => decorate({ minItems: -1 })).toThrow(`${name} error: Property 'ArrayBoundsDto.items': 'minItems' is less than 0`);
		expect(() => decorate({ maxItems: -1, minItems: undefined })).toThrow(`Property 'ArrayBoundsDto.items': 'maxItems' is less than 0`);
		expect(() => decorate({ maxItems: 1, minItems: 2 })).toThrow(`${name} error: Property 'ArrayBoundsDto.items': 'minItems' is greater than 'maxItems'`);
		expect(() => decorate({ isUniqueItems: true, maxItems: 1, minItems: 1 })).toThrow(`${name} error: Property 'ArrayBoundsDto.items': 'uniqueItems' is true but 'maxItems' is less than or equal to 1`);
	});

	it("ignores bounds on a property that is not an array", () => {
		const exampleValue: unknown = Array.isArray(specificOptions.exampleValue) ? specificOptions.exampleValue[0] : undefined;

		expect(() => decorate({ exampleValue, isArray: false, maxItems: Number.NaN })).not.toThrow();
	});
});

describe.each(DECORATORS)("%s response array schema", (name: string, decorator: (options: never) => PropertyDecorator, specificOptions: Record<string, unknown>) => {
	// The JSON a client reads: a key that only holds undefined is not published.
	const buildItemsSchema = async (overrides: Record<string, unknown>): Promise<Record<string, unknown>> => {
		class ResponseArrayDto {
			public items!: unknown;
		}

		const propertyDecorator: PropertyDecorator = Reflect.apply(decorator, undefined, [{ ...SHARED_OPTIONS, ...specificOptions, isRequired: undefined, isResponse: true, ...overrides }]);

		propertyDecorator(ResponseArrayDto.prototype, "items");

		@Controller(name)
		class ResponseArrayController {
			@ApiOkResponse({ type: ResponseArrayDto })
			@Get()
			public read(): void {}
		}

		const moduleReference: Awaited<ReturnType<ReturnType<typeof Test.createTestingModule>["compile"]>> = await Test.createTestingModule({ controllers: [ResponseArrayController] }).compile();
		const application: NestFastifyApplication = moduleReference.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
		const document: { components: { schemas: { ResponseArrayDto: { properties: { items: Record<string, unknown> } } } } } = JSON.parse(JSON.stringify(SwaggerModule.createDocument(application, new DocumentBuilder().build()))) as never;

		await application.close();

		return document.components.schemas.ResponseArrayDto.properties.items;
	};

	it("publishes no bounds when a response array leaves them out", async () => {
		const schema: Record<string, unknown> = await buildItemsSchema({});

		expect(schema.type).toBe("array");
		expect(schema).not.toHaveProperty("minItems");
		expect(schema).not.toHaveProperty("maxItems");
		expect(schema).not.toHaveProperty("uniqueItems");
	});

	it("publishes the bounds a response array declares", async () => {
		expect(await buildItemsSchema(BOUNDS)).toMatchObject({ maxItems: 3, minItems: 1, type: "array", uniqueItems: false });
	});
});
