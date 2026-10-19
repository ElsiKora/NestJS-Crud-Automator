import { EnumValues } from "@utility/enum/values.utility";
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

describe("EnumValues", () => {
	it("returns member values of string enums", () => {
		expect(EnumValues(EStringEnum)).toEqual(["first", "second"]);
	});

	it("removes numeric reverse mappings from numeric and mixed enums", () => {
		expect(EnumValues(ENumericEnum)).toEqual([0, 1]);
		expect(EnumValues(EMixedEnum)).toEqual([0, "enabled"]);
	});

	it("removes numeric reverse mappings while preserving heterogeneous values", () => {
		const values = EnumValues({
			0: "DISABLED",
			DISABLED: 0,
			ENABLED: "enabled",
		});

		expect(values).toEqual([0, "enabled"]);
		expect(Object.isFrozen(values)).toBe(true);
	});

	it("preserves numeric-looking keys that are not reverse mappings", () => {
		expect(
			EnumValues({
				200: "success",
			}),
		).toEqual(["success"]);
	});

	it("preserves members whose names are not finite numeric keys", () => {
		expect(EnumValues({ " ": "space", "": "empty", Infinity: "infinity" })).toEqual(["space", "empty", "infinity"]);
	});
});
