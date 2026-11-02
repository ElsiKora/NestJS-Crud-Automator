import "reflect-metadata";

import { plainToInstance } from "class-transformer";
import { describe, expect, it } from "vitest";

import { DtoGenerateGetListNumericEnumValueDecorator } from "../../../../../../src/utility/dto/generate/get-list/numeric-enum-value-decorator.utility";

enum ELevel {
	HIGH = 2,
	LOW = 1,
}

enum EMixed {
	ONE = 1,
	TEXT = "2",
}

class LevelDto {
	@DtoGenerateGetListNumericEnumValueDecorator(ELevel)
	public level?: unknown;
}

class MixedDto {
	@DtoGenerateGetListNumericEnumValueDecorator(EMixed)
	public level?: unknown;
}

const read = (level: unknown): unknown => plainToInstance(LevelDto, { level }).level;

describe("DtoGenerateGetListNumericEnumValueDecorator", () => {
	it("converts the exact text of a numeric member", () => {
		expect(read("1")).toBe(ELevel.LOW);
		expect(read(["1", "2"])).toEqual([ELevel.LOW, ELevel.HIGH]);
	});

	it.each(["3", "1.0", "01", " 1", "1e0", "LOW", ""])("keeps %j as it came for the enum validator", (value: string) => {
		expect(read(value)).toBe(value);
	});

	it("keeps a number, an absent value and a value of another type", () => {
		expect(read(1)).toBe(1);
		expect(read(undefined)).toBeUndefined();
		expect(read(null)).toBeNull();
		expect(read(true)).toBe(true);
	});

	it("keeps the text of a string member of a mixed enum", () => {
		expect(plainToInstance(MixedDto, { level: "1" }).level).toBe(EMixed.ONE);
		expect(plainToInstance(MixedDto, { level: "2" }).level).toBe(EMixed.TEXT);
	});
});
