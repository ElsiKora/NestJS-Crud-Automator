import type { ValidationArguments } from "class-validator";

import { HasAtLeastOnePropertyValidator } from "@validator/has/at/least/one/property.validator";
import { describe, expect, it } from "vitest";

describe("HasAtLeastOnePropertyValidator", () => {
	it("validates objects with at least one key", () => {
		const validator = new HasAtLeastOnePropertyValidator();
		const args = { object: { value: "test" } } as ValidationArguments;

		expect(validator.validate(undefined, args)).toBe(true);
	});

	it("fails when object is empty", () => {
		const validator = new HasAtLeastOnePropertyValidator();
		const args = { object: {} } as ValidationArguments;

		expect(validator.validate(undefined, args)).toBe(false);
		expect(validator.defaultMessage()).toBe("at least one property must be provided");
	});
});
