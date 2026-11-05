import { IsBigIntColumnType } from "@utility/is/bigint-column-type.utility";
import { IsSignedBigIntText } from "@utility/is/signed-bigint-text.utility";
import { describe, expect, it } from "vitest";

describe("IsSignedBigIntText", () => {
	it.each(["0", "1", "-1", "16", "9223372036854775807", "-9223372036854775808", "1000000000000000000"])("accepts %s", (value: string) => {
		expect(IsSignedBigIntText(value)).toBe(true);
	});

	it.each(["9223372036854775808", "-9223372036854775809", "99999999999999999999", "-0", "016", "+1", "1.0", "1e3", " 1", "1 ", "", "abc", "0x10"])("refuses %j", (value: string) => {
		expect(IsSignedBigIntText(value)).toBe(false);
	});

	it.each([1, 1n, null, undefined, {}])("refuses the non-text value %#", (value: unknown) => {
		expect(IsSignedBigIntText(value)).toBe(false);
	});
});

describe("IsBigIntColumnType", () => {
	it.each(["bigint", "BIGINT", "int8", "int64"])("reads %s as a signed 64-bit integer column", (type: string) => {
		expect(IsBigIntColumnType(type)).toBe(true);
	});

	it.each(["int", "integer", "numeric", "decimal", "unsigned big int", "varchar", Number, String, undefined])("reads %s as another column", (type: unknown) => {
		expect(IsBigIntColumnType(type)).toBe(false);
	});
});
