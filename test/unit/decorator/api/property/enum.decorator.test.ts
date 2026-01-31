import "reflect-metadata";

import { ApiPropertyEnum } from "@decorator/api/property/enum.decorator";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { DECORATORS } from "@nestjs/swagger/dist/constants";
import { describe, expect, it } from "vitest";

const StatusEnum = { ACTIVE: "active", INACTIVE: "inactive" } as const;

class EnumEntity {}

class EnumDto {
	@ApiPropertyEnum({
		description: "status",
		entity: EnumEntity,
		enum: StatusEnum,
		enumName: "Status",
		isRequired: true,
	})
	public status!: string;
}

class EnumArrayDto {
	@ApiPropertyEnum({
		description: "roles",
		entity: EnumEntity,
		enum: StatusEnum,
		enumName: "Status",
		isArray: true,
		isRequired: true,
		isUniqueItems: true,
		maxItems: 3,
		minItems: 2,
	})
	public roles!: Array<string>;
}

describe("ApiPropertyEnum", () => {
	it("writes swagger enum options", () => {
		const metadata = Reflect.getMetadata(DECORATORS.API_MODEL_PROPERTIES, EnumDto.prototype, "status");

		expect(metadata?.enum).toEqual(expect.arrayContaining(["active", "inactive"]));
		expect(metadata?.example).toBe("active");
	});

	it("validates enum values", () => {
		const errors = validateSync(plainToInstance(EnumDto, { status: "archived" }));

		expect(errors[0]?.constraints?.isEnum).toBeDefined();
		expect(validateSync(plainToInstance(EnumDto, { status: "active" }))).toHaveLength(0);
	});

	it("validates enum arrays and size constraints", () => {
		const emptyErrors = validateSync(plainToInstance(EnumArrayDto, { roles: [] }));

		expect(emptyErrors[0]?.constraints?.arrayMinSize).toBeDefined();
		expect(emptyErrors[0]?.constraints?.arrayNotEmpty).toBeDefined();

		const invalidErrors = validateSync(plainToInstance(EnumArrayDto, { roles: ["active", "archived"] }));
		expect(invalidErrors[0]?.constraints?.isEnum).toBeDefined();
	});

	it("throws when exampleValue is not in enum", () => {
		const applyDecorator = () => {
			const decorator = ApiPropertyEnum({
				description: "status",
				entity: EnumEntity,
				enum: StatusEnum,
				enumName: "Status",
				exampleValue: "archived",
				isRequired: true,
			});

			decorator({}, "status");
		};

		expect(applyDecorator).toThrow("ApiPropertyEnum error: 'exampleValue' is not in 'enum'");
	});
});
