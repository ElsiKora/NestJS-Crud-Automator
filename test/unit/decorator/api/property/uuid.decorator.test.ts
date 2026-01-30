import "reflect-metadata";

import { ApiPropertyUUID } from "@decorator/api/property/uuid.decorator";
import { EApiPropertyStringType } from "@enum/decorator/api";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { DECORATORS } from "@nestjs/swagger/dist/constants";
import { describe, expect, it } from "vitest";

class UuidEntity {}

class UuidDto {
	@ApiPropertyUUID({
		description: "id",
		entity: UuidEntity,
		isRequired: true,
	})
	public id!: string;
}

class UuidOptionalDto {
	@ApiPropertyUUID({
		description: "id",
		entity: UuidEntity,
		isRequired: false,
	})
	public id?: string;
}

class UuidArrayDto {
	@ApiPropertyUUID({
		description: "ids",
		entity: UuidEntity,
		isArray: true,
		isRequired: true,
		isUniqueItems: false,
		maxItems: 3,
		minItems: 2,
	})
	public ids!: string[];
}

describe("ApiPropertyUUID", () => {
	it("writes swagger metadata", () => {
		const metadata = Reflect.getMetadata(DECORATORS.API_MODEL_PROPERTIES, UuidDto.prototype, "id");

		expect(metadata?.format).toBe(EApiPropertyStringType.UUID);
		expect(metadata?.minLength).toBe(metadata?.maxLength);
		expect(metadata?.pattern).toContain("[0-9a-fA-F]");
	});

	it("validates UUID values", () => {
		const errors = validateSync(plainToInstance(UuidDto, { id: "not-uuid" }));

		expect(errors[0]?.constraints?.isUuid).toBeDefined();
		expect(validateSync(plainToInstance(UuidDto, { id: "550e8400-e29b-41d4-a716-446655440000" }))).toHaveLength(0);
	});

	it("skips validation when optional UUID is missing", () => {
		const errors = validateSync(plainToInstance(UuidOptionalDto, {}));

		expect(errors).toHaveLength(0);
	});

	it("validates UUID arrays and size constraints", () => {
		const errors = validateSync(plainToInstance(UuidArrayDto, { ids: [] }));

		expect(errors[0]?.constraints?.arrayMinSize).toBeDefined();
		expect(errors[0]?.constraints?.arrayNotEmpty).toBeDefined();
	});

	it("throws on invalid array options", () => {
		const applyDecorator = () => {
			const decorator = ApiPropertyUUID({
				description: "ids",
				entity: UuidEntity,
				isArray: true,
				isRequired: true,
				isUniqueItems: false,
				maxItems: 1,
				minItems: 2,
			});

			decorator({}, "ids");
		};

		expect(applyDecorator).toThrow("ApiPropertyUUID error: 'minItems' is greater than 'maxItems'");
	});
});
