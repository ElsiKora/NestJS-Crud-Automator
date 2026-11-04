import "reflect-metadata";

import { ApiPropertyNumber } from "@decorator/api/property/number.decorator";
import { EApiDtoType, EApiPropertyDataType, EApiPropertyNumberType } from "@enum/decorator/api";
import { DtoRequestWireBindDto } from "@utility/dto/request-wire/bind";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { SWAGGER_METADATA_CONSTANT } from "@constant/swagger";
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

class NumberFractionalStepDto {
	@ApiPropertyNumber({
		description: "price",
		entity: NumberEntity,
		exampleValue: 29.99,
		format: EApiPropertyNumberType.DOUBLE,
		isRequired: true,
		maximum: 1000,
		minimum: 0,
		multipleOf: 0.01,
	})
	public price!: number;

	@ApiPropertyNumber({
		description: "prices",
		entity: NumberEntity,
		exampleValue: [0.1],
		format: EApiPropertyNumberType.DOUBLE,
		isArray: true,
		isRequired: true,
		isUniqueItems: false,
		maxItems: 3,
		maximum: 1000,
		minItems: 1,
		minimum: 0,
		multipleOf: 0.01,
	})
	public prices!: Array<number>;
}

class NumberOptionalDto {
	@ApiPropertyNumber({
		description: "count",
		entity: NumberEntity,
		exampleValue: 2,
		format: EApiPropertyNumberType.INTEGER,
		maximum: 10,
		minimum: 1,
		multipleOf: 1,
		isRequired: false,
	})
	public count?: number;
}

class NumberQueryDto extends NumberDto {}

class NumberPathDto extends NumberDto {}

class NumberArrayQueryDto extends NumberArrayDto {}

class NumberDoubleQueryDto extends NumberDoubleDto {}

DtoRequestWireBindDto(NumberQueryDto, EApiDtoType.QUERY, "a query");
DtoRequestWireBindDto(NumberPathDto, EApiDtoType.PARAMETERS, "a path");
DtoRequestWireBindDto(NumberArrayQueryDto, EApiDtoType.QUERY, "a query");
DtoRequestWireBindDto(NumberDoubleQueryDto, EApiDtoType.QUERY, "a query");

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
		const metadata = Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES, NumberDto.prototype, "count");

		expect(metadata?.type).toBe(EApiPropertyDataType.INTEGER);
		expect(metadata?.format).toBe("int32");
		expect(metadata?.minimum).toBe(1);
		expect(metadata?.maximum).toBe(10);
	});

	it.each([
		["query", NumberQueryDto],
		["path", NumberPathDto],
	])("converts integer text in a %s DTO and validates it", (_place: string, dto: typeof NumberDto) => {
		const instance = plainToInstance(dto, { count: "4" });

		expect(instance.count).toBe(4);
		expect(validateSync(instance)).toHaveLength(0);

		const errors = validateSync(plainToInstance(dto, { count: 3 }));
		expect(errors[0]?.constraints?.isDivisibleBy).toBeDefined();
	});

	it("keeps integer text in a JSON body DTO for IsInt to refuse, and accepts a JSON number", () => {
		const instance = plainToInstance(NumberDto, { count: "4" });

		expect(instance.count).toBe("4");
		expect(validateSync(instance)[0]?.constraints?.isInt).toBe("count must be an integer number");
		expect(validateSync(plainToInstance(NumberDto, { count: 4 }))).toHaveLength(0);
	});

	it("rejects non-integers for integer formats", () => {
		const errors = validateSync(plainToInstance(NumberDto, { count: 1.5 }));

		expect(errors[0]?.constraints?.isInt).toBeDefined();
	});

	it("keeps optional numbers undefined when missing", () => {
		const instance = plainToInstance(NumberOptionalDto, {});
		const errors = validateSync(instance);

		expect(instance.count).toBeUndefined();
		expect(errors).toHaveLength(0);
	});

	it("reads a fractional multipleOf as a decimal under the constraint name hosts map", () => {
		const accepted = plainToInstance(NumberFractionalStepDto, { price: 0.1, prices: [0.1, 29.99] });

		expect(validateSync(accepted)).toEqual([]);

		const errors = validateSync(plainToInstance(NumberFractionalStepDto, { price: 1.005, prices: [0.1, 1.005] }));

		expect(errors.map((error) => error.constraints)).toEqual([{ isDivisibleBy: "price must be divisible by 0.01" }, { isDivisibleBy: "each value in prices must be divisible by 0.01" }]);
	});

	it("validates numeric arrays and size constraints", () => {
		const emptyErrors = validateSync(plainToInstance(NumberArrayDto, { values: [] }));

		expect(emptyErrors[0]?.constraints?.arrayMinSize).toBeDefined();
		expect(emptyErrors[0]?.constraints?.arrayNotEmpty).toBeDefined();

		const instance = plainToInstance(NumberArrayQueryDto, { values: ["2", "4"] });
		expect(instance.values).toEqual([2, 4]);
		expect(validateSync(instance)).toHaveLength(0);
		expect(validateSync(plainToInstance(NumberArrayDto, { values: [2, 4] }))).toHaveLength(0);
	});

	it("checks each item of a JSON body list as sent", () => {
		const instance = plainToInstance(NumberArrayDto, { values: [2, "4"] });

		expect(instance.values).toEqual([2, "4"]);
		expect(validateSync(instance)[0]?.constraints?.isInt).toBe("each value in values must be an integer number");
	});

	it("wraps a single array value into a one-item array before converting it in a query", () => {
		const instance = plainToInstance(NumberArrayQueryDto, { values: "2" });

		expect(instance.values).toEqual([2]);
		expect(validateSync(instance).map((error) => Object.keys(error.constraints ?? {}))).toEqual([["arrayMinSize"]]);
	});

	it("wraps a single JSON body value into a one-item array without converting it", () => {
		expect(plainToInstance(NumberArrayDto, { values: 2 }).values).toEqual([2]);
		expect(plainToInstance(NumberArrayDto, { values: "2" }).values).toEqual(["2"]);
	});

	it("validates double formats with divisibility rules", () => {
		const instance = plainToInstance(NumberDoubleQueryDto, { ratio: "1.3" });

		expect(instance.ratio).toBe(1.3);
		const errors = validateSync(instance);

		expect(errors[0]?.constraints?.isDivisibleBy).toBeDefined();
		expect(validateSync(plainToInstance(NumberDoubleDto, { ratio: "1.5" }))[0]?.constraints?.isNumber).toBe("ratio must be a number conforming to the specified constraints");
		expect(validateSync(plainToInstance(NumberDoubleDto, { ratio: 1.5 }))).toHaveLength(0);
	});

	it("does not expose multipleOf in response swagger metadata", () => {
		const metadata = Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES, NumberResponseDto.prototype, "total");

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
