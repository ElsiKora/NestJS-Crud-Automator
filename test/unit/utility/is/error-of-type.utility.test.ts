import { EException } from "@enum/exception.enum";
import { BadRequestException } from "@nestjs/common";
import { IsErrorOfType } from "@utility/is/error-of-type.utility";
import { describe, expect, it } from "vitest";

describe("IsErrorOfType", () => {
	it("matches known exception instances and names", () => {
		expect(IsErrorOfType(new BadRequestException(), EException.BAD_REQUEST)).toBe(true);
		expect(IsErrorOfType({ name: "BadRequestException" }, EException.BAD_REQUEST)).toBe(true);
	});

	it("returns false for unknown or unsupported exception types", () => {
		expect(IsErrorOfType(new Error("boom"), EException.BAD_REQUEST)).toBe(false);
		expect(IsErrorOfType(new Error("boom"), EException.EXPECTATION_FAILED)).toBe(false);
		expect(IsErrorOfType("boom", EException.BAD_REQUEST)).toBe(false);
	});
});
