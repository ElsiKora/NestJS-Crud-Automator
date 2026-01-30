import "reflect-metadata";

import { ApiPropertyNumber } from "@decorator/api/property/number.decorator";
import { EApiPropertyDataType, EApiPropertyNumberType } from "@enum/decorator/api";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { DECORATORS } from "@nestjs/swagger/dist/constants";
import { describe, expect, it } from "vitest";

class NumberEntity {}

class NumberDto {
	@ApiPropertyNumber({
		description: "count",
		entity: NumberEntity,
		exampleValue: 4,
		format: EApiPropertyNumberType.INTEGER,
		maximum: 10,
		minimum: 1,
		multipleOf: 2,
		isRequired: true,
	})
	public count!: number;
}

class NumberArrayDto {
	@ApiPropertyNumber({
		description: "values",
		entity: NumberEntity,
		exampleValue: [2, 4],
		format: EApiPropertyNumberType.INTEGER,
		isArray: true,
		isRequired: true,
		isUniqueItems: true,
		maxItems: 3,
		minItems: 2,
		maximum: 10,
		minimum: 1,
		multipleOf: 1,
	})
	public values!: number[];
}

class NumberDoubleDto {
	@ApiPropertyNumber({
		description: "ratio",
		entity: NumberEntity,
		exampleValue: 1.5,
		format: EApiPropertyNumberType.DOUBLE,
		maximum: 10,
		minimum: 0.1,
		multipleOf: 0.5,
		isRequired: true,
	})
	public ratio!: number;
}

class NumberResponseDto {
	@ApiPropertyNumber({
		description: "total",
		entity: NumberEntity,
		exampleValue: 2,
		format: EApiPropertyNumberType.INTEGER,
		maximum: 10,
		minimum: 1,
		multipleOf: 2,
		isRequired: true,
		isResponse: true,
	})
	public total!: number;
}

describe("ApiPropertyNumber", () => {
	it("writes swagger options for integer numbers", () => {
		const metadata = Reflect.getMetadata(DECORATORS.API_MODEL_PROPERTIES, NumberDto.prototype, "count");

		expect(metadata?.type).toBe(EApiPropertyDataType.INTEGER);
		expect(metadata?.format).toBe("int32");
		expect(metadata?.minimum).toBe(1);
		expect(metadata?.maximum).toBe(10);
	});

	it("transforms string values to numbers and validates integers", () => {
		const instance = plainToInstance(NumberDto, { count: "4" });

		expect(instance.count).toBe(4);
		expect(validateSync(instance)).toHaveLength(0);

		const errors = validateSync(plainToInstance(NumberDto, { count: 3 }));
		expect(errors[0]?.constraints?.isDivisibleBy).toBeDefined();
	});

	it("rejects non-integers for integer formats", () => {
		const errors = validateSync(plainToInstance(NumberDto, { count: 1.5 }));

		expect(errors[0]?.constraints?.isInt).toBeDefined();
	});

	it("validates numeric arrays and size constraints", () => {
		const emptyErrors = validateSync(plainToInstance(NumberArrayDto, { values: [] }));

		expect(emptyErrors[0]?.constraints?.arrayMinSize).toBeDefined();
		expect(emptyErrors[0]?.constraints?.arrayNotEmpty).toBeDefined();

		const instance = plainToInstance(NumberArrayDto, { values: ["2", "4"] });
		expect(instance.values).toEqual([2, 4]);
		expect(validateSync(instance)).toHaveLength(0);
	});

	it("validates double formats with divisibility rules", () => {
		const instance = plainToInstance(NumberDoubleDto, { ratio: "1.3" });

		expect(instance.ratio).toBe(1.3);
		const errors = validateSync(instance);

		expect(errors[0]?.constraints?.isDivisibleBy).toBeDefined();
	});

	it("does not expose multipleOf in response swagger metadata", () => {
		const metadata = Reflect.getMetadata(DECORATORS.API_MODEL_PROPERTIES, NumberResponseDto.prototype, "total");

		expect(metadata?.multipleOf).toBeUndefined();
	});

	it("throws on invalid min/max bounds", () => {
		const applyDecorator = () => {
			const decorator = ApiPropertyNumber({
				description: "count",
				entity: NumberEntity,
				exampleValue: 2,
				format: EApiPropertyNumberType.INTEGER,
				maximum: 1,
				minimum: 5,
				multipleOf: 1,
				isRequired: true,
			});

			decorator({}, "count");
		};

		expect(applyDecorator).toThrow("ApiPropertyNumber error: 'minimum' is greater than maximum");
	});

	it("throws when exampleValue is not divisible by multipleOf", () => {
		const applyDecorator = () => {
			const decorator = ApiPropertyNumber({
				description: "count",
				entity: NumberEntity,
				exampleValue: 3,
				format: EApiPropertyNumberType.INTEGER,
				maximum: 10,
				minimum: 1,
				multipleOf: 2,
				isRequired: true,
			});

			decorator({}, "count");
		};

		expect(applyDecorator).toThrow("ApiPropertyNumber error: 'exampleValue' is not a multiple of 'multipleOf' value: 3");
	});
});
