import "reflect-metadata";

import { NUMBER_CONSTANT } from "@constant/number.constant";
import { SWAGGER_METADATA_CONSTANT } from "@constant/swagger";
import { ApiPropertyBoolean } from "@decorator/api/property/boolean.decorator";
import { ApiPropertyDate } from "@decorator/api/property/date.decorator";
import { ApiPropertyDescribe } from "@decorator/api/property/describe.decorator";
import { ApiPropertyNumber } from "@decorator/api/property/number.decorator";
import { ApiPropertyUUID } from "@decorator/api/property/uuid.decorator";
import { EApiPropertyDateIdentifier, EApiPropertyDateType, EApiPropertyDescribeType, EApiPropertyNumberType } from "@enum/decorator/api";
import { Expose, plainToInstance } from "class-transformer";
import { isUUID, validateSync } from "class-validator";
import { describe, expect, it } from "vitest";

class PathValueRulesEntity {}

class PathValueUuidDto {
	@ApiPropertyUUID({ description: "id", entity: PathValueRulesEntity, isRequired: true })
	public id!: string;
}

class PathValueIntegerDto {
	@ApiPropertyNumber({ description: "id", entity: PathValueRulesEntity, exampleValue: 1, format: EApiPropertyNumberType.INTEGER, isRequired: true, maximum: 2_147_483_647, minimum: -2_147_483_648, multipleOf: 1 })
	public id!: number;
}

class PathValueIntegerArrayDto {
	@ApiPropertyNumber({ description: "ids", entity: PathValueRulesEntity, exampleValue: [1], format: EApiPropertyNumberType.INTEGER, isArray: true, isRequired: true, isUniqueItems: false, maxItems: 5, maximum: 100, minimum: 0, minItems: 1, multipleOf: 1 })
	public ids!: Array<number>;
}

class PathValueBooleanDto {
	@ApiPropertyBoolean({ description: "active", entity: PathValueRulesEntity, isRequired: true })
	public active!: boolean;
}

class PathValueBooleanArrayDto {
	@ApiPropertyBoolean({ description: "flags", entity: PathValueRulesEntity, isArray: true, isRequired: true, isUniqueItems: false, maxItems: 5, minItems: 1 } as never)
	public flags!: Array<boolean>;
}

class PathValueRenamedBooleanDto {
	@Expose({ name: "is_active" })
	@ApiPropertyBoolean({ description: "active", entity: PathValueRulesEntity, isRequired: false })
	public active?: boolean;

	@Expose({ name: "flag_list" })
	@ApiPropertyBoolean({ description: "flags", entity: PathValueRulesEntity, isArray: true, isRequired: false, isUniqueItems: false, maxItems: 5, minItems: 1 } as never)
	public flags?: Array<boolean>;
}

class PathValueRenamedIntegerDto {
	@Expose({ name: "n" })
	@ApiPropertyNumber({ description: "count", entity: PathValueRulesEntity, exampleValue: 1, format: EApiPropertyNumberType.INTEGER, isRequired: false, maximum: 100, minimum: 0, multipleOf: 1 })
	public count?: number;

	@Expose({ name: "id_list" })
	@ApiPropertyNumber({ description: "ids", entity: PathValueRulesEntity, exampleValue: [1], format: EApiPropertyNumberType.INTEGER, isArray: true, isRequired: false, isUniqueItems: false, maxItems: 5, maximum: 100, minimum: 0, minItems: 1, multipleOf: 1 })
	public ids?: Array<number>;
}

class PathValueDoubleDto {
	@ApiPropertyNumber({ description: "ratio", entity: PathValueRulesEntity, exampleValue: 1, format: EApiPropertyNumberType.DOUBLE, isRequired: true, maximum: 10_000, minimum: 0, multipleOf: 0.5 })
	public ratio!: number;
}

class PathValueDateDto {
	@ApiPropertyDate({ description: "day", entity: PathValueRulesEntity, format: EApiPropertyDateType.DATE, identifier: EApiPropertyDateIdentifier.DATE, isRequired: true })
	public day!: Date | string;
}

class PathValueTimeDto {
	@ApiPropertyDate({ description: "at", entity: PathValueRulesEntity, format: EApiPropertyDateType.TIME, identifier: EApiPropertyDateIdentifier.DATE, isRequired: true })
	public at!: Date | string;
}

class PathValueDateTimeDto {
	@ApiPropertyDate({ description: "at", entity: PathValueRulesEntity, format: EApiPropertyDateType.DATE_TIME, identifier: EApiPropertyDateIdentifier.DATE, isRequired: true })
	public at!: Date | string;
}

const UUID_VALUES: Array<string> = [
	"550e8400-e29b-11d4-a716-446655440000",
	"550e8400-e29b-41d4-a716-446655440000",
	"550E8400-E29B-41D4-A716-446655440000",
	"01890a5d-ac96-774b-bcce-b302099a8057",
	"01890a5d-ac96-874b-bcce-b302099a8057",
	"00000000-0000-0000-0000-000000000000",
	"ffffffff-ffff-ffff-ffff-ffffffffffff",
	"FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF",
	"550e8400-e29b-01d4-a716-446655440000",
	"550e8400-e29b-91d4-a716-446655440000",
	"550e8400-e29b-41d4-c716-446655440000",
	"550e8400e29b41d4a716446655440000",
	"{550e8400-e29b-41d4-a716-446655440000}",
	"550e8400-e29b-41d4-a716-44665544000g",
	"not-a-uuid",
	"",
];

describe("path value rules of property decorators", () => {
	it("documents a UUID pattern that accepts exactly the values IsUUID accepts", () => {
		const metadata: { pattern?: string } | undefined = Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES, PathValueUuidDto.prototype, "id") as { pattern?: string } | undefined;
		const pattern: RegExp = new RegExp(metadata?.pattern ?? "$^");

		for (const value of UUID_VALUES) {
			expect({ isPatternMatch: pattern.test(value), value }).toEqual({ isPatternMatch: isUUID(value), value });
			expect({ isValid: validateSync(plainToInstance(PathValueUuidDto, { id: value })).length === 0, value }).toEqual({ isValid: isUUID(value), value });
		}
	});

	it("keeps a request UUID in the letter case it was sent in, for the route to refuse", () => {
		expect(plainToInstance(PathValueUuidDto, { id: "550E8400-E29B-41D4-A716-446655440000" }).id).toBe("550E8400-E29B-41D4-A716-446655440000");
	});

	it.each(["016", " 16", "%2016", "0x10", "16.0", "1.6e1", "1e3", "007", "+16", "16 ", "", "Infinity"])("rejects the non-canonical integer text %j", (value: string) => {
		const errors = validateSync(plainToInstance(PathValueIntegerDto, { id: value }));

		expect(errors[0]?.constraints?.isInt).toBe("id must be an integer number");
	});

	it.each([
		["16", 16],
		["0", 0],
		["-16", -16],
	])("converts the canonical integer text %j", (value: string, expected: number) => {
		const instance: PathValueIntegerDto = plainToInstance(PathValueIntegerDto, { id: value });

		expect(instance.id).toBe(expected);
		expect(validateSync(instance)).toHaveLength(0);
	});

	it("keeps integer numbers and checks each item of an integer array", () => {
		expect(plainToInstance(PathValueIntegerDto, { id: 16 }).id).toBe(16);
		expect(plainToInstance(PathValueIntegerArrayDto, { ids: ["1", "2"] }).ids).toEqual([1, 2]);
		expect(validateSync(plainToInstance(PathValueIntegerArrayDto, { ids: ["1", "02"] }))[0]?.constraints?.isInt).toBeDefined();
	});

	it("rejects an array for a single integer value", () => {
		for (const value of [["007"], ["7"], [7], []]) {
			expect({ errors: validateSync(plainToInstance(PathValueIntegerDto, { id: value })).length > 0, value }).toEqual({ errors: true, value });
		}
	});

	it("accepts only true and false for a boolean value", () => {
		expect(plainToInstance(PathValueBooleanDto, { active: "true" }).active).toBe(true);
		expect(plainToInstance(PathValueBooleanDto, { active: "false" }).active).toBe(false);
		expect(plainToInstance(PathValueBooleanDto, { active: false }).active).toBe(false);
		expect(plainToInstance(PathValueBooleanArrayDto, { flags: ["true", false] }).flags).toEqual([true, false]);

		for (const value of ["1", "0", "no", "TRUE", " true", "garbage", "", 1, 0, ["true"]]) {
			expect({ errors: validateSync(plainToInstance(PathValueBooleanDto, { active: value })).length > 0, value }).toEqual({ errors: true, value });
		}

		expect(validateSync(plainToInstance(PathValueBooleanArrayDto, { flags: ["true", "1"] })).length).toBeGreaterThan(0);
	});

	it("reads the request value itself under implicit conversion, which turns any non-empty text into true", () => {
		const options: { enableImplicitConversion: boolean } = { enableImplicitConversion: true };

		expect(plainToInstance(PathValueBooleanDto, { active: "true" }, options).active).toBe(true);
		expect(plainToInstance(PathValueBooleanDto, { active: "false" }, options).active).toBe(false);
		expect(plainToInstance(PathValueBooleanDto, { active: false }, options).active).toBe(false);
		expect(plainToInstance(PathValueBooleanArrayDto, { flags: ["true", "false"] }, options).flags).toEqual([true, false]);
		expect(plainToInstance(PathValueBooleanArrayDto, { flags: "false" }, options).flags).toEqual([false]);

		for (const value of ["1", "0", "no", "TRUE", "", 1, 0, ["true"]]) {
			expect({ errors: validateSync(plainToInstance(PathValueBooleanDto, { active: value }, options)).length > 0, value }).toEqual({ errors: true, value });
		}

		expect(validateSync(plainToInstance(PathValueBooleanArrayDto, { flags: ["true", "0"] }, options)).length).toBeGreaterThan(0);
	});

	it.each([
		["plain", false],
		["plain", true],
		["renamed", false],
		["renamed", true],
	] as Array<[string, boolean]>)("checks exactly the boolean and integer the client sent, %s, implicit conversion %s", (naming: string, isImplicit: boolean) => {
		const options: { enableImplicitConversion: boolean } = { enableImplicitConversion: isImplicit };
		const isRenamed: boolean = naming === "renamed";
		const toBoolean = (active: unknown): { errors: number; value: unknown } => {
			const instance: { active?: unknown } = isRenamed ? plainToInstance(PathValueRenamedBooleanDto, { is_active: active }, options) : plainToInstance(PathValueBooleanDto, { active }, options);

			return { errors: validateSync(instance).length, value: instance.active };
		};
		const toBooleans = (flags: unknown): { errors: number; value: unknown } => {
			const instance: { flags?: unknown } = isRenamed ? plainToInstance(PathValueRenamedBooleanDto, { flag_list: flags }, options) : plainToInstance(PathValueBooleanArrayDto, { flags }, options);

			return { errors: validateSync(instance).length, value: instance.flags };
		};
		const toInteger = (count: unknown): { errors: number; value: unknown } => {
			const instance: { count?: unknown; id?: unknown } = isRenamed ? plainToInstance(PathValueRenamedIntegerDto, { n: count }, options) : plainToInstance(PathValueIntegerDto, { id: count }, options);

			return { errors: validateSync(instance).length, value: isRenamed ? instance.count : instance.id };
		};
		const toIntegers = (ids: unknown): { errors: number; value: unknown } => {
			const instance: { ids?: unknown } = isRenamed ? plainToInstance(PathValueRenamedIntegerDto, { id_list: ids }, options) : plainToInstance(PathValueIntegerArrayDto, { ids }, options);

			return { errors: validateSync(instance).length, value: instance.ids };
		};

		expect([toBoolean("true"), toBoolean("false"), toBoolean(true), toBoolean(false)]).toEqual([
			{ errors: 0, value: true },
			{ errors: 0, value: false },
			{ errors: 0, value: true },
			{ errors: 0, value: false },
		]);
		expect([toBooleans(["true", "false"]), toBooleans("false")]).toEqual([
			{ errors: 0, value: [true, false] },
			{ errors: 0, value: [false] },
		]);
		expect([toInteger("16"), toInteger(16), toIntegers(["1", "2"]), toIntegers([3])]).toEqual([
			{ errors: 0, value: 16 },
			{ errors: 0, value: 16 },
			{ errors: 0, value: [1, 2] },
			{ errors: 0, value: [3] },
		]);

		for (const sent of ["1", "0", "no", "TRUE", "", 1, 0, ["true"]]) {
			expect({ errors: toBoolean(sent).errors > 0, sent }).toEqual({ errors: true, sent });
		}

		for (const sent of [
			["true", "no"],
			["false", 0],
		]) {
			expect({ errors: toBooleans(sent).errors > 0, sent }).toEqual({ errors: true, sent });
		}

		for (const sent of ["016", "1e1", "0x10", "16.0", " 16", true, ["16"]]) {
			expect({ errors: toInteger(sent).errors > 0, sent }).toEqual({ errors: true, sent });
		}

		for (const sent of [
			["1", "016"],
			["1", true],
		]) {
			expect({ errors: toIntegers(sent).errors > 0, sent }).toEqual({ errors: true, sent });
		}
	});

	it("keeps decimal and exponent text for DOUBLE properties", () => {
		expect(plainToInstance(PathValueDoubleDto, { ratio: "1e3" }).ratio).toBe(1000);
		expect(plainToInstance(PathValueDoubleDto, { ratio: "16.5" }).ratio).toBe(16.5);
	});

	it.each([
		["maximum", { maximum: 9_223_372_036_854_775_807, minimum: 1 }],
		["minimum", { maximum: 1, minimum: -9_223_372_036_854_775_808 }],
	])("fails startup for an integer NUMBER %s outside the safe integer range and names BIGINT_STRING", (_bound: string, range: { maximum: number; minimum: number }) => {
		expect(() => {
			class UnsafeIntegerDto {
				@ApiPropertyNumber({ description: "id", entity: PathValueRulesEntity, exampleValue: 1, format: EApiPropertyNumberType.INTEGER, multipleOf: 1, ...range })
				public id!: number;
			}

			return UnsafeIntegerDto;
		}).toThrow(/BIGINT_STRING/);

		expect(() => {
			class UnsafeIntegerEntity {
				@ApiPropertyDescribe({ description: "id", exampleValue: 1, format: EApiPropertyNumberType.INTEGER, multipleOf: 1, type: EApiPropertyDescribeType.NUMBER, ...range })
				public id!: number;
			}

			return UnsafeIntegerEntity;
		}).toThrow(/UnsafeIntegerEntity\.id: .*BIGINT_STRING/);
	});

	it("accepts an integer NUMBER range up to the safe integer bounds and a wider DOUBLE range", () => {
		expect(() => {
			class SafeIntegerEntity {
				@ApiPropertyDescribe({ description: "id", exampleValue: 1, format: EApiPropertyNumberType.INTEGER, maximum: Number.MAX_SAFE_INTEGER, minimum: Number.MIN_SAFE_INTEGER, multipleOf: 1, type: EApiPropertyDescribeType.NUMBER })
				public id!: number;

				@ApiPropertyDescribe({ description: "ratio", exampleValue: 1, format: EApiPropertyNumberType.DOUBLE, maximum: Number.MAX_VALUE, minimum: -Number.MAX_VALUE, multipleOf: 0.5, type: EApiPropertyDescribeType.NUMBER })
				public ratio!: number;
			}

			return SafeIntegerEntity;
		}).not.toThrow();
	});

	it("no longer offers bigint bounds as number constants", () => {
		expect(Object.keys(NUMBER_CONSTANT)).not.toContain("MAX_BIGINT");
		expect(Object.keys(NUMBER_CONSTANT)).not.toContain("MIN_BIGINT");
	});

	it("keeps a date-only request value as the validated YYYY-MM-DD string", () => {
		const instance: PathValueDateDto = plainToInstance(PathValueDateDto, { day: "2024-03-10" });

		expect(instance.day).toBe("2024-03-10");
		expect(validateSync(instance)).toHaveLength(0);

		for (const value of ["2024-02-30", "2024-3-10", "2024-03-10T00:00:00Z", "not-a-date"]) {
			expect({ errors: validateSync(plainToInstance(PathValueDateDto, { day: value })).length > 0, value }).toEqual({ errors: true, value });
		}
	});

	it("keeps a time-only request value as the validated string", () => {
		const instance: PathValueTimeDto = plainToInstance(PathValueTimeDto, { at: "23:59:59" });

		expect(instance.at).toBe("23:59:59");
		expect(validateSync(instance)).toHaveLength(0);
		expect(validateSync(plainToInstance(PathValueTimeDto, { at: "24:00:00" })).length).toBeGreaterThan(0);
	});

	it("converts a date-time request value to a Date", () => {
		const instance: PathValueDateTimeDto = plainToInstance(PathValueDateTimeDto, { at: "2024-03-10T12:00:00.000Z" });

		expect(instance.at).toBeInstanceOf(Date);
		expect(validateSync(instance)).toHaveLength(0);
	});
});
