import type { ValidationArguments } from "class-validator";

import { AllOrNoneOfListedPropertiesValidator } from "@validator/all-or-none-of-listed-properties.validator";
import { describe, expect, it } from "vitest";

describe("AllOrNoneOfListedPropertiesValidator", () => {
	it("passes when none or all listed fields are set", () => {
		const validator = new AllOrNoneOfListedPropertiesValidator();
		const argsNone = { constraints: ["a", "b"], object: {} } as ValidationArguments;
		const argsAll = { constraints: ["a", "b"], object: { a: 1, b: 2 } } as ValidationArguments;

		expect(validator.validate(undefined, argsNone)).toBe(true);
		expect(validator.validate(undefined, argsAll)).toBe(true);
	});

	it("fails when only some listed fields are set", () => {
		const validator = new AllOrNoneOfListedPropertiesValidator();
		const args = { constraints: ["a", "b"], object: { a: 1 } } as ValidationArguments;

		expect(validator.validate(undefined, args)).toBe(false);
		expect(validator.defaultMessage(args)).toContain("either all or none");
	});
});
