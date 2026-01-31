import type { ValidationArguments } from "class-validator";

import { OnlyOneOfListedPropertiesValidator } from "@validator/only-one-of-listed-properties.validator";
import { describe, expect, it } from "vitest";

describe("OnlyOneOfListedPropertiesValidator", () => {
	it("passes when exactly one field is set", () => {
		const validator = new OnlyOneOfListedPropertiesValidator();
		const args = { constraints: ["a", "b"], object: { a: 1 } } as ValidationArguments;

		expect(validator.validate(undefined, args)).toBe(true);
	});

	it("fails when none or multiple fields are set", () => {
		const validator = new OnlyOneOfListedPropertiesValidator();
		const noneArgs = { constraints: ["a", "b"], object: {} } as ValidationArguments;
		const multiArgs = { constraints: ["a", "b"], object: { a: 1, b: 2 } } as ValidationArguments;

		expect(validator.validate(undefined, noneArgs)).toBe(false);
		expect(validator.validate(undefined, multiArgs)).toBe(false);
		expect(validator.defaultMessage(multiArgs)).toContain("only one of the following properties");
	});
});
