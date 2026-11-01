import "reflect-metadata";

import { ApiPropertyBoolean } from "@decorator/api/property/boolean.decorator";
import { EApiPropertyDataType } from "@enum/decorator/api";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { SWAGGER_METADATA_CONSTANT } from "@constant/swagger";
import { describe, expect, it } from "vitest";

class BooleanEntity {}

class BooleanDto {
	@ApiPropertyBoolean({
		description: "isActive",
		entity: BooleanEntity,
		isRequired: true,
	})
	public isActive!: boolean;
}

class BooleanOptionalDto {
	@ApiPropertyBoolean({
		description: "isEnabled",
		entity: BooleanEntity,
		isRequired: false,
	})
	public isEnabled?: boolean;
}

class BooleanArrayDto {
	@ApiPropertyBoolean({
		description: "flags",
		entity: BooleanEntity,
		isArray: true,
		isRequired: true,
		isUniqueItems: true,
		maxItems: 3,
		minItems: 2,
	})
	public flags!: boolean[];
}

describe("ApiPropertyBoolean", () => {
	it("writes swagger options for single values", () => {
		const metadata = Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES, BooleanDto.prototype, "isActive");

		expect(metadata?.type).toBe(EApiPropertyDataType.BOOLEAN);
		expect(metadata?.required).toBe(true);
		expect(metadata?.example).toBe(true);
		expect(metadata?.description).toContain("BooleanEntity");
	});

	it("transforms input values to booleans", () => {
		const instance = plainToInstance(BooleanDto, { isActive: "true" });

		expect(instance.isActive).toBe(true);
		expect(validateSync(instance)).toHaveLength(0);
	});

	it("validates required booleans", () => {
		const errors = validateSync(plainToInstance(BooleanDto, {}));

		expect(errors[0]?.constraints?.isBoolean).toBeDefined();
	});

	it("skips validation for optional booleans when missing", () => {
		const instance = plainToInstance(BooleanOptionalDto, {});
		const errors = validateSync(instance);

		expect(instance.isEnabled).toBeUndefined();
		expect(errors).toHaveLength(0);
	});

	it("validates boolean arrays and size constraints", () => {
		const emptyErrors = validateSync(plainToInstance(BooleanArrayDto, { flags: [] }));

		expect(emptyErrors[0]?.constraints?.arrayMinSize).toBeDefined();
		expect(emptyErrors[0]?.constraints?.arrayNotEmpty).toBeDefined();

		const instance = plainToInstance(BooleanArrayDto, { flags: ["true", "false"] });
		expect(instance.flags).toEqual([true, false]);
		expect(validateSync(instance)).toHaveLength(0);
	});

	it("keeps any text other than true or false in boolean arrays for the validator", () => {
		const instance = plainToInstance(BooleanArrayDto, { flags: ["1", "0"] });

		expect(instance.flags).toEqual(["1", "0"]);
		expect(validateSync(instance)[0]?.constraints?.isBoolean).toBeDefined();
	});

	it("throws on invalid array options", () => {
		const applyDecorator = () => {
			const decorator = ApiPropertyBoolean({
				description: "flags",
				entity: BooleanEntity,
				isArray: true,
				isRequired: true,
				isUniqueItems: true,
				maxItems: 1,
				minItems: 2,
			});

			decorator({}, "flags");
		};

		expect(applyDecorator).toThrow("ApiPropertyBoolean error: Property 'Object.flags': 'minItems' is greater than 'maxItems'");
	});
});
