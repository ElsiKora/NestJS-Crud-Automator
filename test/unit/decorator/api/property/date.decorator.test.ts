import "reflect-metadata";

import { ApiPropertyDate } from "@decorator/api/property/date.decorator";
import { EApiPropertyDateIdentifier, EApiPropertyDateType } from "@enum/decorator/api";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { DECORATORS } from "@nestjs/swagger/dist/constants";
import { describe, expect, it } from "vitest";

class DateEntity {}

class DateDto {
	@ApiPropertyDate({
		description: "createdAt",
		entity: DateEntity,
		format: EApiPropertyDateType.DATE_TIME,
		identifier: EApiPropertyDateIdentifier.CREATED_AT,
		isRequired: true,
	})
	public createdAt!: Date;
}

class DateArrayDto {
	@ApiPropertyDate({
		description: "dates",
		entity: DateEntity,
		format: EApiPropertyDateType.DATE,
		identifier: EApiPropertyDateIdentifier.DATE,
		isArray: true,
		isRequired: true,
		isUniqueItems: true,
		maxItems: 3,
		minItems: 2,
	})
	public dates!: Date[];
}

class DateResponseDto {
	@ApiPropertyDate({
		description: "updatedAt",
		entity: DateEntity,
		format: EApiPropertyDateType.DATE_TIME,
		identifier: EApiPropertyDateIdentifier.UPDATED_AT,
		isResponse: true,
	})
	public updatedAt!: string;
}

describe("ApiPropertyDate", () => {
	it("writes swagger options for date formats", () => {
		const metadata = Reflect.getMetadata(DECORATORS.API_MODEL_PROPERTIES, DateDto.prototype, "createdAt");

		expect(metadata?.format).toBe(EApiPropertyDateType.DATE_TIME);
		expect(metadata?.pattern).toBe("^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.[0-9]{3}Z$");
		expect(metadata?.description).toBe("DateEntity creation date");
		expect(metadata?.minLength).toBe(metadata?.maxLength);
	});

	it("transforms ISO strings to Date instances and validates them", () => {
		const instance = plainToInstance(DateDto, { createdAt: "2025-01-01T00:00:00.000Z" });

		expect(instance.createdAt).toBeInstanceOf(Date);
		expect(validateSync(instance)).toHaveLength(0);
	});

	it("validates invalid date values", () => {
		const instance = plainToInstance(DateDto, { createdAt: "not-a-date" });
		const errors = validateSync(instance);

		expect(errors[0]?.constraints?.isDate).toBeDefined();
	});

	it("validates array size constraints", () => {
		const errors = validateSync(plainToInstance(DateArrayDto, { dates: [] }));

		expect(errors[0]?.constraints?.arrayMinSize).toBeDefined();
		expect(errors[0]?.constraints?.arrayNotEmpty).toBeDefined();
	});

	it("skips request validation for response DTOs", () => {
		const instance = plainToInstance(DateResponseDto, { updatedAt: "not-a-date" });

		expect(typeof instance.updatedAt).toBe("string");
		expect(validateSync(instance, { forbidUnknownValues: false })).toHaveLength(0);
	});

	it("throws on invalid array options", () => {
		const applyDecorator = () => {
			const decorator = ApiPropertyDate({
				description: "dates",
				entity: DateEntity,
				format: EApiPropertyDateType.DATE,
				identifier: EApiPropertyDateIdentifier.DATE,
				isArray: true,
				isRequired: true,
				isUniqueItems: true,
				maxItems: 1,
				minItems: 2,
			});

			decorator({}, "dates");
		};

		expect(applyDecorator).toThrow("ApiPropertyDate error: 'minItems' is greater than 'maxItems'");
	});
});
