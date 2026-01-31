import type { ValidationArguments } from "class-validator";

import { MustMatchOneOfSchemasConstraint } from "@validator/must-match-one-of-schemas.validator";
import { describe, expect, it } from "vitest";

class SchemaA {}
class SchemaB {}

const buildArgs = (discriminatorValue?: string): ValidationArguments =>
	({
		constraints: [
			{
				discriminator: {
					mapping: { A: "SchemaA", B: "SchemaB" },
					propertyName: "kind",
				},
				schemas: {
					SchemaA,
					SchemaB,
				},
			},
		],
		property: "payload",
		value: discriminatorValue,
	}) as unknown as ValidationArguments;

describe("MustMatchOneOfSchemasConstraint", () => {
	it("returns false for non-object values", () => {
		const validator = new MustMatchOneOfSchemasConstraint();
		const args = buildArgs();

		expect(validator.validate("invalid", args)).toBe(false);
		expect(validator.defaultMessage(args)).toContain("must match one of the schemas");
	});

	it("fails when discriminator is missing or invalid", () => {
		const validator = new MustMatchOneOfSchemasConstraint();
		const args = buildArgs();

		expect(validator.validate({ other: "value" } as object, args)).toBe(false);
		expect(validator.defaultMessage(args)).toContain("missing required discriminator field");

		expect(validator.validate({ kind: "C" } as object, args)).toBe(false);
		expect(validator.defaultMessage(args)).toContain("invalid discriminator value");
	});

	it("passes when discriminator matches allowed schema", () => {
		const validator = new MustMatchOneOfSchemasConstraint();
		const args = buildArgs();

		expect(validator.validate({ kind: "A" }, args)).toBe(true);
	});

	it("handles missing or invalid discriminator configuration", () => {
		const validator = new MustMatchOneOfSchemasConstraint();

		const missingConfigArgs = {
			constraints: [],
			object: {},
			property: "payload",
			targetName: "payload",
			value: undefined,
		} as ValidationArguments;
		expect(validator.validate({ kind: "A" }, missingConfigArgs)).toBe(false);
		expect(validator.defaultMessage(missingConfigArgs)).toContain("must match one of the valid schemas");

		const invalidPropertyArgs = {
			constraints: [
				{
					discriminator: { mapping: { A: "SchemaA" }, propertyName: 123 },
				},
			],
			property: "payload",
		} as unknown as ValidationArguments;
		expect(validator.validate({ kind: "A" }, invalidPropertyArgs)).toBe(false);
		expect(validator.defaultMessage(invalidPropertyArgs)).toContain("must match one of the valid schemas");

		const invalidValueArgs = buildArgs();
		expect(validator.validate({ kind: 123 } as object, invalidValueArgs)).toBe(false);
		expect(validator.defaultMessage(invalidValueArgs)).toContain("invalid discriminator value");

		const missingMappingArgs = {
			constraints: [
				{
					discriminator: { propertyName: "kind" },
				},
			],
			property: "payload",
		} as unknown as ValidationArguments;
		expect(validator.validate({ kind: "A" }, missingMappingArgs)).toBe(false);
		expect(validator.defaultMessage(missingMappingArgs)).toContain("must match one of the schemas");
	});
});
