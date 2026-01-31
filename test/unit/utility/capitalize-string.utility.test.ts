import { CapitalizeString } from "@utility/capitalize-string.utility";
import { describe, expect, it } from "vitest";

describe("CapitalizeString", () => {
	it("capitalizes the first letter and lowercases the rest", () => {
		expect(CapitalizeString("gET")).toBe("Get");
		expect(CapitalizeString("hello")).toBe("Hello");
	});
});
