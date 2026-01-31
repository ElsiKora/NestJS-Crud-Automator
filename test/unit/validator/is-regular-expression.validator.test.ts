import { IsRegularExpressionValidator } from "@validator/is-regular-expression.validator";
import { describe, expect, it } from "vitest";

describe("IsRegularExpressionValidator", () => {
	it("returns true for valid regex patterns", () => {
		const validator = new IsRegularExpressionValidator();

		expect(validator.validate("^[a-z]+$")).toBe(true);
	});

	it("returns false for invalid or empty patterns", () => {
		const validator = new IsRegularExpressionValidator();

		expect(validator.validate("[a-")).toBe(false);
		expect(validator.validate("")).toBe(false);
	});
});
