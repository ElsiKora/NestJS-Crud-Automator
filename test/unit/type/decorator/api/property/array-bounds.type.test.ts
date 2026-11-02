import type { TApiPropertyBooleanProperties, TApiPropertyDateProperties, TApiPropertyEnumProperties, TApiPropertyNumberProperties, TApiPropertyObjectProperties, TApiPropertyStringProperties, TApiPropertyUuidProperties } from "../../../../../../src";

import { describe, expect, it } from "vitest";

import { EApiPropertyDateIdentifier, EApiPropertyDateType, EApiPropertyNumberType, EApiPropertyStringType } from "../../../../../../src";

class ArrayBoundsItemDto {}

class ArrayBoundsEntity {}

const SHARED = { description: "items", entity: ArrayBoundsEntity, isArray: true } as const;
const BOUNDS = { isUniqueItems: false, maxItems: 10, minItems: 0 } as const;
const REQUEST = { ...SHARED, isRequired: true } as const;
const UNMARKED = { ...REQUEST, isResponse: false } as const;
const RESPONSE = { ...SHARED, isResponse: true } as const;
const DATE = { format: EApiPropertyDateType.DATE_TIME, identifier: EApiPropertyDateIdentifier.DATE } as const;
const ENUM = { enum: { ACTIVE: "active" }, enumName: "ArrayBoundsStatus" } as const;
const NUMBER = { exampleValue: [1], format: EApiPropertyNumberType.INTEGER, maximum: 10, minimum: 0, multipleOf: 1 };
const OBJECT = { shouldValidateNested: true, type: ArrayBoundsItemDto } as const;
const STRING = { exampleValue: ["item"], format: EApiPropertyStringType.STRING, maxLength: 10, minLength: 1, pattern: "/^.+$/" };

describe("TApiProperty*Properties array bounds", () => {
	it("lets a response array leave out its bounds", () => {
		const responses: [TApiPropertyBooleanProperties, TApiPropertyDateProperties, TApiPropertyEnumProperties, TApiPropertyNumberProperties, TApiPropertyObjectProperties, TApiPropertyStringProperties, TApiPropertyUuidProperties] = [{ ...RESPONSE }, { ...RESPONSE, ...DATE }, { ...RESPONSE, ...ENUM }, { ...RESPONSE, ...NUMBER }, { ...RESPONSE, type: ArrayBoundsItemDto }, { ...RESPONSE, ...STRING }, { ...RESPONSE }];

		expect(responses.every((properties: { isArray?: boolean }): boolean => properties.isArray === true)).toBe(true);
	});

	it("keeps requiring bounds on a request array", () => {
		// @ts-expect-error A request array must declare isUniqueItems, maxItems and minItems.
		const boolean: TApiPropertyBooleanProperties = { ...REQUEST };
		// @ts-expect-error A request array must declare isUniqueItems, maxItems and minItems.
		const date: TApiPropertyDateProperties = { ...REQUEST, ...DATE };
		// @ts-expect-error A request array must declare isUniqueItems, maxItems and minItems.
		const enumeration: TApiPropertyEnumProperties = { ...REQUEST, ...ENUM };
		// @ts-expect-error A request array must declare isUniqueItems, maxItems and minItems.
		const number: TApiPropertyNumberProperties = { ...REQUEST, ...NUMBER };
		// @ts-expect-error A request array must declare isUniqueItems, maxItems and minItems.
		const object: TApiPropertyObjectProperties = { ...REQUEST, ...OBJECT };
		// @ts-expect-error A request array must declare isUniqueItems, maxItems and minItems.
		const string: TApiPropertyStringProperties = { ...REQUEST, ...STRING };
		// @ts-expect-error A request array must declare isUniqueItems, maxItems and minItems.
		const uuid: TApiPropertyUuidProperties = { ...REQUEST };

		expect([boolean, date, enumeration, number, object, string, uuid]).toHaveLength(7);
	});

	it("treats isResponse false as a request", () => {
		// @ts-expect-error A route that is not marked as a response is a request, so it must declare its bounds too.
		const boolean: TApiPropertyBooleanProperties = { ...UNMARKED };
		// @ts-expect-error A route that is not marked as a response is a request, so it must declare its bounds too.
		const date: TApiPropertyDateProperties = { ...UNMARKED, ...DATE };
		// @ts-expect-error A route that is not marked as a response is a request, so it must declare its bounds too.
		const enumeration: TApiPropertyEnumProperties = { ...UNMARKED, ...ENUM };
		// @ts-expect-error A route that is not marked as a response is a request, so it must declare its bounds too.
		const number: TApiPropertyNumberProperties = { ...UNMARKED, ...NUMBER };
		// @ts-expect-error A route that is not marked as a response is a request, so it must declare its bounds too.
		const object: TApiPropertyObjectProperties = { ...UNMARKED, ...OBJECT };
		// @ts-expect-error A route that is not marked as a response is a request, so it must declare its bounds too.
		const string: TApiPropertyStringProperties = { ...UNMARKED, ...STRING };
		// @ts-expect-error A route that is not marked as a response is a request, so it must declare its bounds too.
		const uuid: TApiPropertyUuidProperties = { ...UNMARKED };

		expect([boolean, date, enumeration, number, object, string, uuid]).toHaveLength(7);
	});

	it("accepts a request array with its bounds", () => {
		const requests: [TApiPropertyBooleanProperties, TApiPropertyDateProperties, TApiPropertyEnumProperties, TApiPropertyNumberProperties, TApiPropertyObjectProperties, TApiPropertyStringProperties, TApiPropertyUuidProperties] = [
			{ ...REQUEST, ...BOUNDS },
			{ ...REQUEST, ...BOUNDS, ...DATE },
			{ ...REQUEST, ...BOUNDS, ...ENUM },
			{ ...REQUEST, ...BOUNDS, ...NUMBER },
			{ ...REQUEST, ...BOUNDS, ...OBJECT },
			{ ...REQUEST, ...BOUNDS, ...STRING },
			{ ...REQUEST, ...BOUNDS },
		];

		expect(requests).toHaveLength(7);
	});
});
