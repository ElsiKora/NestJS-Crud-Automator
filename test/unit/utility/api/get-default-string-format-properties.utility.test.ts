import { EApiPropertyStringType } from "@enum/decorator/api";
import { GetDefaultStringFormatProperties } from "@utility/api/get-default-string-format-properties.utility";
import { describe, expect, it } from "vitest";

describe("GetDefaultStringFormatProperties", () => {
	it("returns a clone of default properties", () => {
		const first = GetDefaultStringFormatProperties(EApiPropertyStringType.EMAIL);
		const second = GetDefaultStringFormatProperties(EApiPropertyStringType.EMAIL);

		first.description = "changed";

		expect(second.description).not.toBe("changed");
		expect(second.description).toBeDefined();
	});
});
