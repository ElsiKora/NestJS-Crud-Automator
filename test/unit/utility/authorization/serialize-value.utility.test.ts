import { AuthorizationSerializeParameters, AuthorizationSerializeValue } from "@utility/authorization/serialize-value.utility";
import { describe, expect, it } from "vitest";

describe("AuthorizationSerializeValue", () => {
	it("writes a date-time as ISO 8601 UTC with milliseconds", () => {
		expect(AuthorizationSerializeValue(new Date("2024-03-10T12:00:00Z"))).toBe("2024-03-10T12:00:00.000Z");
		expect(AuthorizationSerializeValue(new Date("2024-03-10T17:00:00.5+05:00"))).toBe("2024-03-10T12:00:00.500Z");
	});

	it("writes integers, bigints and booleans as their canonical text and keeps text as given", () => {
		expect(AuthorizationSerializeValue(16)).toBe("16");
		expect(AuthorizationSerializeValue(-0)).toBe("0");
		expect(AuthorizationSerializeValue(9_007_199_254_740_993n)).toBe("9007199254740993");
		expect(AuthorizationSerializeValue(true)).toBe("true");
		expect(AuthorizationSerializeValue(false)).toBe("false");
		expect(AuthorizationSerializeValue("2024-03-10")).toBe("2024-03-10");
	});

	it("gives no text for values without one", () => {
		for (const value of [undefined, null, Number.NaN, Number.POSITIVE_INFINITY, new Date("invalid"), {}, ["16"]]) {
			expect(AuthorizationSerializeValue(value)).toBeUndefined();
		}
	});
});

describe("AuthorizationSerializeParameters", () => {
	it("writes each typed path value as text and leaves out values without one", () => {
		expect(AuthorizationSerializeParameters({ active: false, at: new Date("2024-03-10T12:00:00Z"), id: 16, missing: undefined })).toEqual({ active: "false", at: "2024-03-10T12:00:00.000Z", id: "16" });
		expect(AuthorizationSerializeParameters(undefined)).toBeUndefined();
	});
});
