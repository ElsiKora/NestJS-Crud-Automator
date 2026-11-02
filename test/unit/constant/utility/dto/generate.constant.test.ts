import { DTO_GENERATE_CONSTANT } from "@constant/utility/dto/generate.constant";
import { describe, expect, it } from "vitest";

describe("DTO_GENERATE_CONSTANT", () => {
	it("keeps only the filter value bound that generated DTOs use", () => {
		expect(DTO_GENERATE_CONSTANT).toEqual({ MAXIMUM_FILTER_PROPERTIES: 100 });
	});
});
