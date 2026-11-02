import { describe, expect, it } from "vitest";

import { IsDecimalDivisibleBy } from "../../../../src/utility/is/decimal-divisible-by.utility";

describe("IsDecimalDivisibleBy", () => {
	it.each([
		[0.1, 0.01],
		[1.5, 0.01],
		[29.99, 0.01],
		[0.3, 0.1],
		[1.1, 0.1],
		[4.35, 0.05],
		[0, 0.01],
		[-1.5, 0.01],
		[10, 2],
		[10, 2.5],
		[1e21, 1],
		[1e21, 0.01],
		[1e-7, 1e-7],
		[3e-7, 1e-7],
		[Number.MAX_SAFE_INTEGER, 1],
	])("accepts %d as a multiple of %d", (value: number, divisor: number) => {
		expect(IsDecimalDivisibleBy(value, divisor)).toBe(true);
	});

	it.each([
		[1.005, 0.01],
		[0.015, 0.01],
		[-1.005, 0.01],
		[10, 3],
		[1.5, 1],
		[10, 2.6],
		[1.5e-7, 1e-7],
		[1, 1e21],
	])("rejects %d as a multiple of %d", (value: number, divisor: number) => {
		expect(IsDecimalDivisibleBy(value, divisor)).toBe(false);
	});

	it.each([
		["1.5", 0.01],
		[null, 0.01],
		[undefined, 0.01],
		[Number.NaN, 0.01],
		[Number.POSITIVE_INFINITY, 0.01],
		[1.5, 0],
		[1.5, Number.NaN],
		[1.5, Number.POSITIVE_INFINITY],
		[1.5, "0.01"],
	])("rejects %j with the divisor %j", (value: unknown, divisor: unknown) => {
		expect(IsDecimalDivisibleBy(value, divisor)).toBe(false);
	});
});
