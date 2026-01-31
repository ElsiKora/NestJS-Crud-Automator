import type { ValidationArguments } from "class-validator";

import { HasAtLeastOneAndOnlyOneOfListedPropertiesValidator } from "@validator/has/at/least/one/and-only-one-of-listed-properties.validator";
import { describe, expect, it } from "vitest";

describe("HasAtLeastOneAndOnlyOneOfListedPropertiesValidator", () => {
	it("passes when exactly one field is set", () => {
		const validator = new HasAtLeastOneAndOnlyOneOfListedPropertiesValidator();
		const args = { constraints: ["a", "b"], object: { b: 2 } } as ValidationArguments;

		expect(validator.validate(undefined, args)).toBe(true);
	});

	it("fails when zero or multiple fields are set", () => {
		const validator = new HasAtLeastOneAndOnlyOneOfListedPropertiesValidator();
		const noneArgs = { constraints: ["a", "b"], object: {} } as ValidationArguments;
		const multiArgs = { constraints: ["a", "b"], object: { a: 1, b: 2 } } as ValidationArguments;

		expect(validator.validate(undefined, noneArgs)).toBe(false);
		expect(validator.validate(undefined, multiArgs)).toBe(false);
		expect(validator.defaultMessage(multiArgs)).toContain("at least one and only one");
	});
});
