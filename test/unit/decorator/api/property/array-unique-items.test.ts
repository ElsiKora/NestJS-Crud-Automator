import "reflect-metadata";

import { ApiPropertyBoolean } from "@decorator/api/property/boolean.decorator";
import { ApiPropertyDate } from "@decorator/api/property/date.decorator";
import { ApiPropertyEnum } from "@decorator/api/property/enum.decorator";
import { ApiPropertyNumber } from "@decorator/api/property/number.decorator";
import { ApiPropertyObject } from "@decorator/api/property/object.decorator";
import { ApiPropertyString } from "@decorator/api/property/string.decorator";
import { ApiPropertyUUID } from "@decorator/api/property/uuid.decorator";
import { EApiDtoType, EApiPropertyDateIdentifier, EApiPropertyDateType, EApiPropertyNumberType, EApiPropertyStringType } from "@enum/decorator/api";
import { ValidationPipe } from "@nestjs/common";
import { DtoRequestWireBindDto } from "@utility/dto/request-wire/bind";
import { plainToInstance } from "class-transformer";
import { IsNumber, validateSync } from "class-validator";
import { describe, expect, it } from "vitest";

const UUID_FIRST: string = "6f1b0c7e-5c3b-4c0a-8a1a-0d6f3e2b1a11";
const UUID_SECOND: string = "7a2c1d8f-6d4c-4d1b-9b2b-1e7f4f3c2b22";
const STATUS = { ACTIVE: "active", INACTIVE: "inactive" } as const;

class UniqueItemsEntity {}

class UniqueItemsChildDto {
	@IsNumber()
	public id!: number;
}

type TArrayDtoFactory = (isUniqueItems: boolean) => new () => object;

const ARRAY_BOUNDS = { isArray: true, isRequired: true, maxItems: 3, minItems: 2 } as const;

const buildBooleanDto: TArrayDtoFactory = (isUniqueItems: boolean) => {
	class Dto {
		@ApiPropertyBoolean({ ...ARRAY_BOUNDS, description: "items", entity: UniqueItemsEntity, isUniqueItems })
		public items!: unknown;
	}

	return Dto;
};

const buildDateDto: TArrayDtoFactory = (isUniqueItems: boolean) => {
	class Dto {
		@ApiPropertyDate({ ...ARRAY_BOUNDS, description: "items", entity: UniqueItemsEntity, format: EApiPropertyDateType.DATE_TIME, identifier: EApiPropertyDateIdentifier.DATE, isUniqueItems })
		public items!: unknown;
	}

	return Dto;
};

const buildEnumDto: TArrayDtoFactory = (isUniqueItems: boolean) => {
	class Dto {
		@ApiPropertyEnum({ ...ARRAY_BOUNDS, description: "items", entity: UniqueItemsEntity, enum: STATUS, enumName: "UniqueItemsStatus", isUniqueItems })
		public items!: unknown;
	}

	return Dto;
};

const buildNumberDto: TArrayDtoFactory = (isUniqueItems: boolean) => {
	class Dto {
		@ApiPropertyNumber({ ...ARRAY_BOUNDS, description: "items", entity: UniqueItemsEntity, exampleValue: [2, 4], format: EApiPropertyNumberType.INTEGER, isUniqueItems, maximum: 10, minimum: 1, multipleOf: 1 })
		public items!: unknown;
	}

	return Dto;
};

const buildObjectDto: TArrayDtoFactory = (isUniqueItems: boolean) => {
	class Dto {
		@ApiPropertyObject({ ...ARRAY_BOUNDS, description: "items", entity: UniqueItemsEntity, isUniqueItems, shouldValidateNested: true, type: UniqueItemsChildDto })
		public items!: unknown;
	}

	return Dto;
};

const buildStringDto: TArrayDtoFactory = (isUniqueItems: boolean) => {
	class Dto {
		@ApiPropertyString({ ...ARRAY_BOUNDS, description: "items", entity: UniqueItemsEntity, exampleValue: ["first", "second"], format: EApiPropertyStringType.STRING, isUniqueItems, maxLength: 10, minLength: 1, pattern: "/^.+$/" })
		public items!: unknown;
	}

	return Dto;
};

const buildUuidDto: TArrayDtoFactory = (isUniqueItems: boolean) => {
	class Dto {
		@ApiPropertyUUID({ ...ARRAY_BOUNDS, description: "items", entity: UniqueItemsEntity, isUniqueItems })
		public items!: unknown;
	}

	return Dto;
};

const CASES: Array<[string, TArrayDtoFactory, Array<unknown>, Array<unknown>]> = [
	["ApiPropertyBoolean", buildBooleanDto, [true, true], [true, false]],
	["ApiPropertyDate", buildDateDto, ["2026-01-01T00:00:00.000Z", "2026-01-01T00:00:00.000Z"], ["2026-01-01T00:00:00.000Z", "2026-01-02T00:00:00.000Z"]],
	["ApiPropertyEnum", buildEnumDto, ["active", "active"], ["active", "inactive"]],
	["ApiPropertyNumber", buildNumberDto, [7, 7], [7, 8]],
	["ApiPropertyObject", buildObjectDto, [{ id: 1 }, { id: 1 }], [{ id: 1 }, { id: 2 }]],
	["ApiPropertyString", buildStringDto, ["first", "first"], ["first", "second"]],
	["ApiPropertyUUID", buildUuidDto, [UUID_FIRST, UUID_FIRST], [UUID_FIRST, UUID_SECOND]],
];

const RESPONSE_CASES: Array<[string, (options: never) => PropertyDecorator, Record<string, unknown>, Array<unknown>]> = [
	["ApiPropertyBoolean", ApiPropertyBoolean, {}, [true, true]],
	["ApiPropertyDate", ApiPropertyDate, { format: EApiPropertyDateType.DATE_TIME, identifier: EApiPropertyDateIdentifier.DATE }, ["2026-01-01T00:00:00.000Z", "2026-01-01T00:00:00.000Z"]],
	["ApiPropertyEnum", ApiPropertyEnum, { enum: STATUS, enumName: "UniqueItemsResponseStatus" }, ["active", "active"]],
	["ApiPropertyNumber", ApiPropertyNumber, { exampleValue: [2, 4], format: EApiPropertyNumberType.INTEGER, maximum: 10, minimum: 1, multipleOf: 1 }, [7, 7]],
	["ApiPropertyObject", ApiPropertyObject, { type: UniqueItemsChildDto }, [{ id: 1 }, { id: 1 }]],
	["ApiPropertyString", ApiPropertyString, { exampleValue: ["first", "second"], format: EApiPropertyStringType.STRING, maxLength: 10, minLength: 1, pattern: "/^.+$/" }, ["first", "first"]],
	["ApiPropertyUUID", ApiPropertyUUID, {}, [UUID_FIRST, UUID_FIRST]],
];

const getItemsConstraints = (factory: TArrayDtoFactory, isUniqueItems: boolean, items: Array<unknown>): Array<string> => {
	const errors = validateSync(plainToInstance(factory(isUniqueItems), { items }));

	return errors.flatMap((error) => Object.keys(error.constraints ?? {}));
};

describe("isUniqueItems on request arrays", () => {
	describe.each(CASES)("%s", (_name: string, factory: TArrayDtoFactory, duplicates: Array<unknown>, distinct: Array<unknown>) => {
		it("rejects duplicates when isUniqueItems is true", () => {
			expect(getItemsConstraints(factory, true, duplicates)).toEqual(["arrayUniqueItems"]);
		});

		it("accepts distinct items when isUniqueItems is true", () => {
			expect(getItemsConstraints(factory, true, distinct)).toEqual([]);
		});

		it("accepts duplicates when isUniqueItems is false", () => {
			expect(getItemsConstraints(factory, false, duplicates)).toEqual([]);
		});
	});

	it.each([
		["ApiPropertyBoolean", buildBooleanDto, ["true", true]],
		["ApiPropertyNumber", buildNumberDto, ["7", 7]],
	])("compares %s items of a query after they are transformed", (_name: string, factory: TArrayDtoFactory, items: Array<unknown>) => {
		const dto: new () => object = factory(true);

		DtoRequestWireBindDto(dto, EApiDtoType.QUERY, "a query");

		expect(validateSync(plainToInstance(dto, { items })).flatMap((error) => Object.keys(error.constraints ?? {}))).toEqual(["arrayUniqueItems"]);
	});

	it("compares ApiPropertyDate items in the one published form of an instant", () => {
		expect(getItemsConstraints(buildDateDto, true, ["2026-01-01T00:00:00.000Z", "2026-01-01T00:00:00.000Z"])).toEqual(["arrayUniqueItems"]);
	});

	it("refuses another spelling of an ApiPropertyDate instant before items are compared", () => {
		expect(getItemsConstraints(buildDateDto, true, ["2026-01-01T00:00:00.000Z", "2026-01-01T03:00:00.000+03:00"])).toEqual(["isDateFormatValue"]);
	});

	it("compares ApiPropertyUUID items without regard to case", () => {
		expect(getItemsConstraints(buildUuidDto, true, [UUID_FIRST, UUID_FIRST.toUpperCase()])).toEqual(["arrayUniqueItems"]);
	});

	it("compares ApiPropertyString items exactly", () => {
		expect(getItemsConstraints(buildStringDto, true, ["first", "FIRST"])).toEqual([]);
	});

	it("does not count an undeclared key that a ValidationPipe without whitelist leaves on an item", async () => {
		const pipe: ValidationPipe = new ValidationPipe({ transform: true });
		const items: Array<unknown> = [
			{ id: 1, note: "a" },
			{ id: 1, note: "b" },
		];

		await expect(pipe.transform({ items }, { metatype: buildObjectDto(true), type: "body" })).rejects.toMatchObject({ response: { message: ["items must not contain duplicate items"] } });
	});

	it("reports a value that is not an array through IsArray only", () => {
		const errors = validateSync(plainToInstance(buildBooleanDto(true), { items: "true" }));

		expect(errors.flatMap((error) => Object.keys(error.constraints ?? {}))).not.toContain("arrayUniqueItems");
	});

	// Reflect.apply passes a response array in one table; its options differ per decorator.
	it.each(RESPONSE_CASES)("does not validate uniqueness on a response %s array", (_name: string, decorator: (options: never) => PropertyDecorator, options: Record<string, unknown>, duplicates: Array<unknown>) => {
		class ResponseDto {
			public items!: unknown;
		}

		const propertyDecorator: PropertyDecorator = Reflect.apply(decorator, undefined, [{ description: "items", entity: UniqueItemsEntity, isArray: true, isResponse: true, isUniqueItems: true, maxItems: 3, minItems: 2, ...options }]);

		propertyDecorator(ResponseDto.prototype, "items");

		const errors = validateSync(plainToInstance(ResponseDto, { items: duplicates }), { forbidUnknownValues: false });

		expect(errors.flatMap((error) => Object.keys(error.constraints ?? {}))).not.toContain("arrayUniqueItems");
	});
});
