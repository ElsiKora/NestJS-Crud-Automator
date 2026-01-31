import type { ValidationArguments } from "class-validator";

import { EFilterOperation } from "@enum/filter";
import { HasPairedCustomSuffixesFieldsValidator } from "@validator/has";
import { describe, expect, it } from "vitest";

const buildArgs = (object: Record<string, unknown>): ValidationArguments & { constraints: [string, string[]] } =>
	({
		constraints: ["operator", ["value", "values"]],
		object,
	}) as ValidationArguments & { constraints: [string, string[]] };

describe("HasPairedCustomSuffixesFieldsValidator", () => {
	it("validates properly paired operator and value fields", () => {
		const validator = new HasPairedCustomSuffixesFieldsValidator();
		const args = buildArgs({
			"age[operator]": EFilterOperation.EQ,
			"age[value]": 10,
		});

		expect(validator.validate(undefined, args)).toBe(true);
	});

	it("fails when value is provided without operator", () => {
		const validator = new HasPairedCustomSuffixesFieldsValidator();
		const args = buildArgs({
			"age[value]": 10,
		});

		expect(validator.validate(undefined, args)).toBe(false);
		expect(validator.defaultMessage(args)).toContain("must have an operator suffix");
	});

	it("fails when operator expects array with exact length", () => {
		const validator = new HasPairedCustomSuffixesFieldsValidator();
		const args = buildArgs({
			"range[operator]": EFilterOperation.BETWEEN,
			"range[values]": [1],
		});

		expect(validator.validate(undefined, args)).toBe(false);
		expect(validator.defaultMessage(args)).toContain("requires exactly 2 values");
	});

	it("fails when operator expects no values but value is present", () => {
		const validator = new HasPairedCustomSuffixesFieldsValidator();
		const args = buildArgs({
			"flag[operator]": EFilterOperation.ISNULL,
			"flag[value]": "unexpected",
		});

		expect(validator.validate(undefined, args)).toBe(false);
		expect(validator.defaultMessage(args)).toContain("should not have any values");
	});
});
