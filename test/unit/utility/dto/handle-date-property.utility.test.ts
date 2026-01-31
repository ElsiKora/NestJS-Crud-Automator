import { EApiPropertyDateIdentifier } from "@enum/decorator/api";
import { DtoHandleDateProperty } from "@utility/dto/handle-date-property.utility";
import { describe, expect, it } from "vitest";

describe("DtoHandleDateProperty", () => {
	it("expands base identifiers into from/to variants", () => {
		const result = DtoHandleDateProperty("createdAt", EApiPropertyDateIdentifier.CREATED_AT);

		expect(result).toEqual([
			{ identifier: EApiPropertyDateIdentifier.CREATED_AT_FROM, name: "createdAtFrom" },
			{ identifier: EApiPropertyDateIdentifier.CREATED_AT_TO, name: "createdAtTo" },
		]);
	});

	it("returns original property for non-range identifiers", () => {
		const result = DtoHandleDateProperty("expiresIn", EApiPropertyDateIdentifier.EXPIRES_IN);

		expect(result).toEqual([{ identifier: EApiPropertyDateIdentifier.EXPIRES_IN, name: "expiresIn" }]);
	});
});
