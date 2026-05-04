import "reflect-metadata";

import { ApiPropertyBoolean } from "@decorator/api/property/boolean.decorator";
import { ApiPropertyDate } from "@decorator/api/property/date.decorator";
import { ApiPropertyEnum } from "@decorator/api/property/enum.decorator";
import { ApiPropertyNumber } from "@decorator/api/property/number.decorator";
import { ApiPropertyObject } from "@decorator/api/property/object.decorator";
import { ApiPropertyString } from "@decorator/api/property/string.decorator";
import { ApiPropertyUUID } from "@decorator/api/property/uuid.decorator";
import { EApiPropertyDateIdentifier, EApiPropertyDateType, EApiPropertyNumberType, EApiPropertyStringType } from "@enum/decorator/api";
import { plainToInstance } from "class-transformer";
import { IsString, validateSync } from "class-validator";
import { describe, expect, it } from "vitest";

class MatrixEntity {}

class MatrixChildDto {
	@IsString()
	public name!: string;
}

const StatusEnum = { ACTIVE: "active", INACTIVE: "inactive" } as const;

const createDto = (decorator: PropertyDecorator) => {
	class MatrixDto {
		public value?: unknown;
	}

	decorator(MatrixDto.prototype, "value");

	return MatrixDto;
};

const cases: Array<{ decorator: (overrides: Record<string, unknown>) => PropertyDecorator; invalid: unknown; name: string; valid: unknown }> = [
	{
		decorator: (overrides) =>
			ApiPropertyString({
				description: "value",
				entity: MatrixEntity,
				exampleValue: "value",
				format: EApiPropertyStringType.STRING,
				maxLength: 64,
				minLength: 1,
				pattern: "/^.+$/",
				...overrides,
			} as never),
		invalid: 123,
		name: "string",
		valid: "value",
	},
	{
		decorator: (overrides) =>
			ApiPropertyNumber({
				description: "value",
				entity: MatrixEntity,
				exampleValue: 1,
				format: EApiPropertyNumberType.INTEGER,
				maximum: 10,
				minimum: 0,
				multipleOf: 1,
				...overrides,
			} as never),
		invalid: "1",
		name: "number",
		valid: 1,
	},
	{
		decorator: (overrides) =>
			ApiPropertyBoolean({
				description: "value",
				entity: MatrixEntity,
				...overrides,
			} as never),
		invalid: "not-boolean",
		name: "boolean",
		valid: true,
	},
	{
		decorator: (overrides) =>
			ApiPropertyDate({
				description: "value",
				entity: MatrixEntity,
				format: EApiPropertyDateType.DATE_TIME,
				identifier: EApiPropertyDateIdentifier.DATE,
				...overrides,
			} as never),
		invalid: "not-date",
		name: "date",
		valid: new Date(),
	},
	{
		decorator: (overrides) =>
			ApiPropertyEnum({
				description: "value",
				entity: MatrixEntity,
				enum: StatusEnum,
				enumName: "StatusEnum",
				...overrides,
			} as never),
		invalid: "archived",
		name: "enum",
		valid: "active",
	},
	{
		decorator: (overrides) =>
			ApiPropertyUUID({
				description: "value",
				entity: MatrixEntity,
				...overrides,
			} as never),
		invalid: "not-uuid",
		name: "uuid",
		valid: "550e8400-e29b-41d4-a716-446655440000",
	},
	{
		decorator: (overrides) =>
			ApiPropertyObject({
				description: "value",
				entity: MatrixEntity,
				shouldValidateNested: true,
				type: MatrixChildDto,
				...overrides,
			} as never),
		invalid: { name: 1 },
		name: "object",
		valid: { name: "child" },
	},
];

describe("ApiProperty validation matrix", () => {
	it.each(cases)("applies required and nullable semantics for $name properties", ({ decorator, valid }) => {
		const RequiredDto = createDto(decorator({ isRequired: true }));
		const OptionalDto = createDto(decorator({ isRequired: false }));
		const NullableDto = createDto(decorator({ isNullable: true, isRequired: true }));

		expect(validateSync(plainToInstance(RequiredDto, {})).length).toBeGreaterThan(0);
		expect(validateSync(plainToInstance(RequiredDto, { value: undefined })).length).toBeGreaterThan(0);
		expect(validateSync(plainToInstance(RequiredDto, { value: null })).length).toBeGreaterThan(0);
		expect(validateSync(plainToInstance(RequiredDto, { value: valid }))).toHaveLength(0);
		expect(validateSync(plainToInstance(OptionalDto, {}))).toHaveLength(0);
		expect(validateSync(Object.assign(new NullableDto(), { value: null }))).toHaveLength(0);
	});

	it.each(cases)("does not register request validators for response-only $name properties", ({ decorator, invalid }) => {
		const ResponseDto = createDto(decorator({ isResponse: true }));

		expect(validateSync(plainToInstance(ResponseDto, { value: invalid }), { forbidUnknownValues: false })).toHaveLength(0);
	});
});
