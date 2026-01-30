import "reflect-metadata";

import { ApiPropertyObject } from "@decorator/api/property/object.decorator";
import { plainToInstance } from "class-transformer";
import { IsString, validateSync } from "class-validator";
import { DECORATORS } from "@nestjs/swagger/dist/constants";
import { describe, expect, it } from "vitest";

class ObjectEntity {}

class ChildDto {
	@IsString()
	public name!: string;
}

class ParentDto {
	@ApiPropertyObject({
		description: "payload",
		entity: ObjectEntity,
		isRequired: true,
		shouldValidateNested: true,
		type: ChildDto,
	})
	public payload!: ChildDto;
}

class ObjectArrayDto {
	@ApiPropertyObject({
		description: "payloads",
		entity: ObjectEntity,
		isArray: true,
		isRequired: true,
		isUniqueItems: true,
		maxItems: 3,
		minItems: 2,
		shouldValidateNested: true,
		type: ChildDto,
	})
	public payloads!: Array<ChildDto>;
}

class CatDto {
	@IsString()
	public kind!: string;
}

class DogDto {
	@IsString()
	public kind!: string;
}

class DiscriminatorDto {
	@ApiPropertyObject({
		description: "pet",
		discriminator: {
			mapping: {
				cat: CatDto,
				dog: DogDto,
			},
			propertyName: "kind",
			shouldKeepDiscriminatorProperty: true,
		},
		entity: ObjectEntity,
		isRequired: true,
		shouldValidateNested: true,
		type: [CatDto, DogDto],
	})
	public pet!: CatDto | DogDto;
}

class DynamicDto {
	@ApiPropertyObject({
		description: "dynamic",
		discriminator: {
			mapping: {
				cat: "CatDto",
			},
			propertyName: "kind",
			shouldKeepDiscriminatorProperty: true,
		},
		entity: ObjectEntity,
		generatedDTOs: {
			CatDto,
		},
		isDynamicallyGenerated: true,
		isRequired: true,
		shouldValidateNested: true,
		type: [CatDto],
	})
	public dynamic!: CatDto;
}

describe("ApiPropertyObject", () => {
	it("writes swagger metadata for single objects", () => {
		const metadata = Reflect.getMetadata(DECORATORS.API_MODEL_PROPERTIES, ParentDto.prototype, "payload");

		expect(metadata?.type).toBe(ChildDto);
		expect(metadata?.description).toContain("ObjectEntity");
	});

	it("validates nested objects", () => {
		const instance = plainToInstance(ParentDto, { payload: { name: 123 } });
		const errors = validateSync(instance);

		expect(errors[0]?.children?.[0]?.constraints?.isString).toBeDefined();
		expect(validateSync(plainToInstance(ParentDto, { payload: { name: "ok" } }))).toHaveLength(0);
	});

	it("validates object arrays and size constraints", () => {
		const errors = validateSync(plainToInstance(ObjectArrayDto, { payloads: [] }));

		expect(errors[0]?.constraints?.arrayMinSize).toBeDefined();
		expect(errors[0]?.constraints?.arrayNotEmpty).toBeDefined();
	});

	it("writes swagger oneOf and discriminator info for polymorphic objects", () => {
		const metadata = Reflect.getMetadata(DECORATORS.API_MODEL_PROPERTIES, DiscriminatorDto.prototype, "pet");

		expect(metadata?.oneOf).toHaveLength(2);
		expect(metadata?.discriminator?.propertyName).toBe("kind");
	});

	it("applies discriminator validation rules", () => {
		const instance = plainToInstance(DiscriminatorDto, { pet: { name: "Unknown" } });
		const errors = validateSync(instance);
		const constraintMessages = Object.values(errors[0]?.constraints ?? {}).join(" ");

		expect(constraintMessages).toContain("missing required discriminator field");
	});

	it("handles dynamically generated discriminator mappings", () => {
		const metadata = Reflect.getMetadata(DECORATORS.API_MODEL_PROPERTIES, DynamicDto.prototype, "dynamic");

		expect(metadata?.oneOf).toHaveLength(1);
		expect(metadata?.discriminator?.propertyName).toBe("kind");
	});

	it("throws when array object lacks nested validation", () => {
		const applyDecorator = () => {
			const decorator = ApiPropertyObject({
				description: "payloads",
				entity: ObjectEntity,
				isArray: true,
				isRequired: true,
				isUniqueItems: false,
				maxItems: 2,
				minItems: 1,
				type: Object,
			});

			decorator({}, "payloads");
		};

		expect(applyDecorator).toThrow("ApiPropertyObject error: Array property must be 'shouldValidateNested'");
	});
});
