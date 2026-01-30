import { CamelCaseString } from "@utility/camel-case-string.utility";
import { describe, expect, it } from "vitest";

describe("CamelCaseString", () => {
	it("handles known compounds and separators", () => {
		expect(CamelCaseString("get_list")).toBe("GetList");
		expect(CamelCaseString("partial_update")).toBe("PartialUpdate");
	});

	it("preserves internal capitalization", () => {
		expect(CamelCaseString("getList")).toBe("GetList");
	});
});
