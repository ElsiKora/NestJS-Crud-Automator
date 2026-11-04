import type { IApiAuthorizationIamDecimal } from "@interface/class/api/authorization";

import { ApiAuthorizationIamDecimal } from "@class/api/authorization/iam";
import { describe, expect, it } from "vitest";

const parse = (value: unknown): IApiAuthorizationIamDecimal => {
	const decimal: IApiAuthorizationIamDecimal | undefined = ApiAuthorizationIamDecimal.parse(value);

	if (!decimal) {
		throw new Error(`${String(value)} did not parse`);
	}

	return decimal;
};

describe("ApiAuthorizationIamDecimal", () => {
	describe("parse", () => {
		it.each([
			["0", "0"],
			["-0", "0"],
			["-0.00", "0"],
			["1.50", "1.5"],
			["-12.5", "-12.5"],
			["0.001", "0.001"],
			["9223372036854775807", "9223372036854775807"],
			["-9223372036854775808", "-9223372036854775808"],
			["1234567890123456789012345678.1234567890", "1234567890123456789012345678.123456789"],
			[7, "7"],
			[-0, "0"],
			[1.5, "1.5"],
			[0.1, "0.1"],
			[1e21, "1000000000000000000000"],
			[1.5e-7, "0.00000015"],
			[9_007_199_254_740_991n, "9007199254740991"],
		])("reads %s as %s", (value: unknown, text: string) => {
			expect(ApiAuthorizationIamDecimal.toText(parse(value))).toBe(text);
		});

		it.each(["", " 1", "1 ", "+1", "01", "1.", ".5", "1e3", "0x10", "NaN", "Infinity", "1,5", "--1", true, null, undefined, {}, [], Number.NaN, Number.POSITIVE_INFINITY, new Date(0)])("refuses %j", (value: unknown) => {
			expect(ApiAuthorizationIamDecimal.parse(value)).toBeUndefined();
		});

		it("refuses text of more digits than a comparison reads, so a client cannot make it scale huge numbers", () => {
			expect(ApiAuthorizationIamDecimal.parse("1".repeat(1000))).toBeDefined();
			expect(ApiAuthorizationIamDecimal.parse("1".repeat(1001))).toBeUndefined();
		});
	});

	describe("parseOperand", () => {
		it.each([
			[Number.MAX_SAFE_INTEGER, true],
			[Number.MIN_SAFE_INTEGER, true],
			[0.1, true],
			[1.234_567_890_123_45, true],
			[1e21, true],
			[2 ** 53, false],
			[0.1 + 0.2, false],
			["0.30000000000000004", true],
			["9007199254740993", true],
		])("takes a JSON number only when it is exact: %j", (value: unknown, isTaken: boolean) => {
			expect(ApiAuthorizationIamDecimal.parseOperand(value) !== undefined).toBe(isTaken);
		});
	});

	describe("compare", () => {
		it.each([
			["1.50", "1.5", 0],
			["1.5", "1.50", 0],
			["2", "10", -1],
			["10", "2", 1],
			["-1", "1", -1],
			["-2", "-1", -1],
			["0", "-0", 0],
			["9007199254740993", "9007199254740992", 1],
			["9223372036854775807", "9223372036854775808", -1],
			["0.000000000000000000000000000001", "0", 1],
			["1234567890123456789012345678.000000001", "1234567890123456789012345678", 1],
			["-0.1", "-0.10", 0],
		])("compares %s with %s", (left: string, right: string, order: number) => {
			expect(ApiAuthorizationIamDecimal.compare(parse(left), parse(right))).toBe(order);
		});

		it("never reads a literal through a double: two integers past 2^53 stay apart", () => {
			expect(Number("9007199254740993")).toBe(Number("9007199254740992"));
			expect(ApiAuthorizationIamDecimal.compare(parse("9007199254740993"), parse("9007199254740992"))).toBe(1);
		});
	});

	describe("rounding and digit counts", () => {
		it.each([
			["1.5", 1n, 2n],
			["-1.5", -2n, -1n],
			["2", 2n, 2n],
			["-2", -2n, -2n],
			["0.1", 0n, 1n],
			["-0.1", -1n, 0n],
		])("rounds %s to %s and %s", (text: string, floor: bigint, ceil: bigint) => {
			expect(ApiAuthorizationIamDecimal.floor(parse(text))).toBe(floor);
			expect(ApiAuthorizationIamDecimal.ceil(parse(text))).toBe(ceil);
		});

		it.each([
			["0", 1, 1, true],
			["1000", 1, 4, true],
			["1.50", 2, 1, false],
			["0.001", 1, 1, false],
			["123456789012345", 15, 15, true],
			["1234567890123456", 16, 16, true],
			["-120.50", 4, 3, false],
		])("counts the digits of %s", (text: string, significant: number, integer: number, isInteger: boolean) => {
			const decimal: IApiAuthorizationIamDecimal = parse(text);

			expect(ApiAuthorizationIamDecimal.countSignificantDigits(decimal)).toBe(significant);
			expect(ApiAuthorizationIamDecimal.countIntegerDigits(decimal)).toBe(integer);
			expect(ApiAuthorizationIamDecimal.isInteger(decimal)).toBe(isInteger);
		});

		it("counts the fraction digits it keeps", () => {
			expect(parse("1.50").scale).toBe(1);
			expect(parse("2").scale).toBe(0);
			expect(parse("0.001").scale).toBe(3);
		});
	});
});
