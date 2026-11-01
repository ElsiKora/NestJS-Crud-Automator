import type { TApiPropertyDescribeProperties } from "@type/decorator/api/property";

import { EApiPropertyDescribeType, EApiPropertyNumberType } from "@enum/decorator/api";
import { ApiControllerGetListQueryParseValue } from "@utility/api/controller/get-list/query/parse-value.utility";
import { describe, expect, it } from "vitest";

const INTEGER_METADATA: TApiPropertyDescribeProperties = { description: "amount", exampleValue: 1, format: EApiPropertyNumberType.INTEGER, maximum: 1000, minimum: 0, multipleOf: 1, type: EApiPropertyDescribeType.NUMBER } as TApiPropertyDescribeProperties;
const DOUBLE_METADATA: TApiPropertyDescribeProperties = { description: "price", exampleValue: 1, format: EApiPropertyNumberType.DOUBLE, maximum: 1000, minimum: 0, multipleOf: 0.01, type: EApiPropertyDescribeType.NUMBER } as TApiPropertyDescribeProperties;
const UUID_METADATA: TApiPropertyDescribeProperties = { description: "id", type: EApiPropertyDescribeType.UUID } as TApiPropertyDescribeProperties;

describe("ApiControllerGetListQueryParseValue", () => {
	it.each([
		["2", 2],
		[" 2 ", 2],
		["1e1", 10],
		[3, 3],
	])("parses the integer %j as %j", (value: number | string, expected: number) => {
		expect(ApiControllerGetListQueryParseValue(value, INTEGER_METADATA)).toBe(expected);
	});

	it.each(["", " ", "1.5", "abc", "null", "Infinity", null, undefined, ["1"]])("rejects %j as an integer", (value: unknown) => {
		expect(() => ApiControllerGetListQueryParseValue(value, INTEGER_METADATA)).toThrow("INVALID_FILTER");
	});

	it("parses a fractional number on a double column", () => {
		expect(ApiControllerGetListQueryParseValue("1.5", DOUBLE_METADATA)).toBe(1.5);
	});

	it("keeps a uuid as written", () => {
		expect(ApiControllerGetListQueryParseValue("AAAAAAAA-aaaa-4aaa-8aaa-aaaaaaaaaaaa", UUID_METADATA)).toBe("AAAAAAAA-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
	});

	it.each(["", "not-a-uuid", "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa", 1, null])("rejects %j as a uuid", (value: unknown) => {
		expect(() => ApiControllerGetListQueryParseValue(value, UUID_METADATA)).toThrow("INVALID_FILTER");
	});

	it.each([EApiPropertyDescribeType.OBJECT, EApiPropertyDescribeType.RELATION])("rejects any value on a %s field", (type: EApiPropertyDescribeType) => {
		expect(() => ApiControllerGetListQueryParseValue("x", { type } as TApiPropertyDescribeProperties)).toThrow("INVALID_FILTER");
	});
});
