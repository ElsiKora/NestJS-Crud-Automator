import type { ValidationArguments } from "class-validator";

import { HasAtLeastOneOfListedPropertiesValidator } from "@validator/has/at/least/one/of-listed-properties.validator";
import { describe, expect, it } from "vitest";

const buildArguments = (object: Record<string, unknown>, constraints: Array<string>): ValidationArguments =>
	({
		constraints,
		object,
	}) as ValidationArguments;

describe("HasAtLeastOneOfListedPropertiesValidator", () => {
	it("returns true when at least one constraint is present", () => {
		const validator = new HasAtLeastOneOfListedPropertiesValidator();
		const args = buildArguments({ email: "user@example.com" }, ["email", "name"]);

		expect(validator.validate(undefined, args)).toBe(true);
	});

	it("returns false when none of the constraints are present", () => {
		const validator = new HasAtLeastOneOfListedPropertiesValidator();
		const args = buildArguments({ id: 1 }, ["email", "name"]);

		expect(validator.validate(undefined, args)).toBe(false);
	});

	it("returns true when constraints are empty", () => {
		const validator = new HasAtLeastOneOfListedPropertiesValidator();
		const args = buildArguments({}, []);

		expect(validator.validate(undefined, args)).toBe(true);
	});

	it("includes constraints in default message", () => {
		const validator = new HasAtLeastOneOfListedPropertiesValidator();
		const args = buildArguments({}, ["email", "name"]);

		expect(validator.defaultMessage(args)).toContain("email, name");
	});
});
