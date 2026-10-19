import { EnumIsValue } from "@utility/enum/is-value.utility";
import { describe, expect, it } from "vitest";

enum EStringEnum {
	FIRST = "first",
	SECOND = "second",
}

enum ENumericEnum {
	FIRST = 0,
	SECOND = 1,
}

enum EMixedEnum {
	DISABLED = 0,
	ENABLED = "enabled",
}

describe("EnumIsValue", () => {
	it("accepts member values of string enums and rejects member names", () => {
		expect(EnumIsValue(EStringEnum, EStringEnum.FIRST)).toBe(true);
		expect(EnumIsValue(EStringEnum, "second")).toBe(true);
		expect(EnumIsValue(EStringEnum, "FIRST")).toBe(false);
		expect(EnumIsValue(EStringEnum, "unknown")).toBe(false);
	});

	it("accepts member values of numeric enums and ignores reverse mappings", () => {
		expect(EnumIsValue(ENumericEnum, ENumericEnum.SECOND)).toBe(true);
		expect(EnumIsValue(ENumericEnum, 0)).toBe(true);
		expect(EnumIsValue(ENumericEnum, "FIRST")).toBe(false);
		expect(EnumIsValue(ENumericEnum, "0")).toBe(false);
		expect(EnumIsValue(ENumericEnum, 2)).toBe(false);
	});

	it("accepts member values of mixed enums and ignores reverse mappings", () => {
		expect(EnumIsValue(EMixedEnum, 0)).toBe(true);
		expect(EnumIsValue(EMixedEnum, "enabled")).toBe(true);
		expect(EnumIsValue(EMixedEnum, "DISABLED")).toBe(false);
	});

	it("accepts values of members whose names are not finite numeric keys", () => {
		const enumObject: Readonly<Record<string, string>> = { " ": "space", "": "empty", Infinity: "infinity" };

		expect(EnumIsValue(enumObject, "infinity")).toBe(true);
		expect(EnumIsValue(enumObject, "empty")).toBe(true);
		expect(EnumIsValue(enumObject, "space")).toBe(true);
	});

	it("rejects prototype keys and non-primitive candidates", () => {
		expect(EnumIsValue(EStringEnum, "toString")).toBe(false);
		expect(EnumIsValue(EStringEnum, "constructor")).toBe(false);
		expect(EnumIsValue(EStringEnum, "__proto__")).toBe(false);
		expect(EnumIsValue(EStringEnum, [EStringEnum.FIRST])).toBe(false);
		expect(EnumIsValue(EStringEnum, null)).toBe(false);
		expect(EnumIsValue(EStringEnum, undefined)).toBe(false);
	});
});
