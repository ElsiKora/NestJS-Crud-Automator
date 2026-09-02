import "reflect-metadata";

import { ApiPropertyObject } from "@decorator/api/property/object.decorator";
import { DECORATORS } from "@nestjs/swagger/dist/constants";
import { GetRegisteredAutoDtoChildrenRecursive } from "@utility/register-auto-dto-child.utility";
import { instanceToInstance, plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { describe, expect, it } from "vitest";

import { CatDto, ChildDto, DiscriminatorDto, DogDto, DynamicDto, FreeformResponseDto, ObjectArrayDto, ObjectEntity, ParentDto } from "./object/fixture";

class DiscriminatorArrayDto {
	@ApiPropertyObject({
		description: "pets",
		discriminator: {
			mapping: {
				cat: CatDto,
				dog: DogDto,
			},
			propertyName: "kind",
			shouldKeepDiscriminatorProperty: true,
		},
		entity: ObjectEntity,
		isArray: true,
		isRequired: true,
		isUniqueItems: false,
		maxItems: 2,
		minItems: 1,
		shouldValidateNested: true,
		type: [CatDto, DogDto],
	})
	public pets!: Array<CatDto | DogDto>;
}

class DynamicDiscriminatorArrayDto {
	@ApiPropertyObject({
		description: "pets",
		discriminator: {
			mapping: {
				cat: "CatDto",
				dog: "DogDto",
			},
			propertyName: "kind",
			shouldKeepDiscriminatorProperty: true,
		},
		entity: ObjectEntity,
		generatedDTOs: {
			CatDto,
			DogDto,
		},
		isArray: true,
		isDynamicallyGenerated: true,
		isRequired: true,
		isUniqueItems: false,
		maxItems: 2,
		minItems: 1,
		shouldValidateNested: true,
		type: [CatDto, DogDto],
	})
	public pets!: Array<CatDto | DogDto>;
}

class OpenParentDto {
	@ApiPropertyObject({
		additionalProperties: true,
		description: "open payload",
		entity: ObjectEntity,
		isRequired: true,
		shouldValidateNested: true,
		type: ChildDto,
	})
	public payload!: ChildDto;
}

class OpenObjectArrayDto {
	@ApiPropertyObject({
		additionalProperties: true,
		description: "open payloads",
		entity: ObjectEntity,
		isArray: true,
		isRequired: true,
		isUniqueItems: false,
		maxItems: 2,
		minItems: 1,
		shouldValidateNested: true,
		type: ChildDto,
	})
	public payloads!: Array<ChildDto>;
}

class OpenDiscriminatorDto {
	@ApiPropertyObject({
		additionalProperties: true,
		description: "open pet",
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

	it("accepts and strips undeclared properties from open typed request objects", () => {
		const instance = plainToInstance(OpenParentDto, {
			payload: {
				futureObject: { nested: true },
				name: "ok",
				pay_uri: "https://example.com/payment",
			},
		});
		const errors = validateSync(instance, {
			forbidNonWhitelisted: true,
			forbidUnknownValues: true,
			whitelist: true,
		});

		expect(errors).toHaveLength(0);
		expect(instance.payload).toBeInstanceOf(ChildDto);
		expect(Object.keys(instance.payload)).toEqual(["name"]);
		expect(instance.payload.name).toBe("ok");
	});

	it("does not project open objects during class-to-class transformation", () => {
		const source = new OpenParentDto();
		source.payload = Object.assign(new ChildDto(), {
			futureDataField: true,
			name: "ok",
		});

		const clone = instanceToInstance(source);

		expect(clone.payload).toBeInstanceOf(ChildDto);
		expect(Object.keys(clone.payload).sort()).toEqual(["futureDataField", "name"]);
	});

	it("keeps undeclared parent properties strict around an open nested object", () => {
		const instance = plainToInstance(OpenParentDto, {
			futureEnvelopeField: true,
			payload: { futureDataField: true, name: "ok" },
		});
		const errors = validateSync(instance, {
			forbidNonWhitelisted: true,
			forbidUnknownValues: true,
			whitelist: true,
		});

		expect(errors).toHaveLength(1);
		expect(errors[0]?.property).toBe("futureEnvelopeField");
		expect(errors[0]?.constraints?.whitelistValidation).toContain("should not exist");
		expect(Object.keys(instance.payload)).toEqual(["name"]);
	});

	it("retains declared validation inside an open nested object", () => {
		const instance = plainToInstance(OpenParentDto, {
			payload: { futureDataField: true, name: 123 },
		});
		const errors = validateSync(instance, {
			forbidNonWhitelisted: true,
			forbidUnknownValues: true,
			whitelist: true,
		});

		expect(errors[0]?.children?.[0]?.constraints?.isString).toBeDefined();
		expect(Object.keys(instance.payload)).toEqual(["name"]);
	});

	it("keeps typed nested objects strict unless additional properties are enabled", () => {
		const instance = plainToInstance(ParentDto, {
			payload: { futureDataField: true, name: "ok" },
		});
		const errors = validateSync(instance, {
			forbidNonWhitelisted: true,
			forbidUnknownValues: true,
			whitelist: true,
		});

		expect(errors[0]?.children?.[0]?.constraints?.whitelistValidation).toContain("should not exist");
	});

	it("projects every item in open typed request arrays", () => {
		const instance = plainToInstance(OpenObjectArrayDto, {
			payloads: [
				{ futureDataField: true, name: "first" },
				{ name: "second", pay_uri: "https://example.com/payment" },
			],
		});
		const errors = validateSync(instance, {
			forbidNonWhitelisted: true,
			forbidUnknownValues: true,
			whitelist: true,
		});

		expect(errors).toHaveLength(0);
		expect(instance.payloads.every((payload: ChildDto): boolean => payload instanceof ChildDto)).toBe(true);
		expect(instance.payloads.map((payload: ChildDto): Array<string> => Object.keys(payload))).toEqual([["name"], ["name"]]);
	});

	it("projects the selected variant of open discriminated request objects", () => {
		const instance = plainToInstance(OpenDiscriminatorDto, {
			pet: { futureDataField: true, kind: "cat" },
		});
		const errors = validateSync(instance, {
			forbidNonWhitelisted: true,
			forbidUnknownValues: true,
			whitelist: true,
		});

		expect(errors).toHaveLength(0);
		expect(instance.pet).toBeInstanceOf(CatDto);
		expect(Object.keys(instance.pet)).toEqual(["kind"]);
	});

	it("keeps explicit response-only objects readOnly in swagger", () => {
		const metadata = Reflect.getMetadata(DECORATORS.API_MODEL_PROPERTIES, FreeformResponseDto.prototype, "payload");

		expect(metadata?.readOnly).toBe(true);
	});

	it("preserves free-form object payloads in response serialization", () => {
		const instance = plainToInstance(
			FreeformResponseDto,
			{
				payload: {
					Condition: {
						StringEquals: {
							team: "platform",
						},
					},
					Version: "2012-10-17",
				},
			},
			{
				/* eslint-disable-next-line @elsikora/typescript/naming-convention */
				excludeExtraneousValues: true,
				strategy: "excludeAll",
			},
		);

		expect(instance).toMatchObject({
			payload: {
				Condition: {
					StringEquals: {
						team: "platform",
					},
				},
				Version: "2012-10-17",
			},
		});
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

	it("registers polymorphic object variants as nested DTO children", () => {
		expect(GetRegisteredAutoDtoChildrenRecursive(DiscriminatorDto.prototype)).toEqual(expect.arrayContaining([CatDto, DogDto]));
	});

	it("applies discriminator validation rules", () => {
		const instance = plainToInstance(DiscriminatorDto, { pet: { name: "Unknown" } });
		const errors = validateSync(instance);
		const constraintMessages = Object.values(errors[0]?.constraints ?? {}).join(" ");

		expect(constraintMessages).toContain("missing required discriminator field");
	});

	it("transforms and validates explicit discriminated object arrays per item", () => {
		const instance = plainToInstance(DiscriminatorArrayDto, {
			pets: [{ kind: "cat" }, { kind: "dog" }],
		});

		expect(validateSync(instance)).toHaveLength(0);
		expect(instance.pets[0]).toBeInstanceOf(CatDto);
		expect(instance.pets[1]).toBeInstanceOf(DogDto);
	});

	it("transforms and validates dynamically generated discriminated object arrays per item", () => {
		const instance = plainToInstance(DynamicDiscriminatorArrayDto, {
			pets: [{ kind: "cat" }, { kind: "dog" }],
		});

		expect(validateSync(instance)).toHaveLength(0);
		expect(instance.pets[0]).toBeInstanceOf(CatDto);
		expect(instance.pets[1]).toBeInstanceOf(DogDto);
	});

	it.each([
		["missing", {}, /missing required discriminator field|must match one of the schemas/u],
		["unknown", { kind: "bird" }, /invalid discriminator value 'bird'/u],
	])("rejects %s discriminators inside object arrays", (_caseName: string, pet: Record<string, string>, expectedMessage: RegExp) => {
		const instance = plainToInstance(DiscriminatorArrayDto, {
			pets: [pet, { kind: "cat" }],
		});
		const errors = validateSync(instance);

		expect(errors).toHaveLength(1);
		expect(Object.values(errors[0]?.constraints ?? {}).join(" ")).toMatch(expectedMessage);
	});

	it("handles dynamically generated discriminator mappings", () => {
		const metadata = Reflect.getMetadata(DECORATORS.API_MODEL_PROPERTIES, DynamicDto.prototype, "dynamic");

		expect(metadata?.oneOf).toHaveLength(1);
		expect(metadata?.discriminator?.propertyName).toBe("kind");
	});

	it("throws when discriminator config does not match object variants", () => {
		const applyDecorator = () => {
			const decorator = ApiPropertyObject({
				description: "pet",
				discriminator: {
					mapping: {
						cat: CatDto,
					},
					propertyName: "kind",
					shouldKeepDiscriminatorProperty: true,
				},
				entity: ObjectEntity,
				isRequired: true,
				shouldValidateNested: true,
				type: [CatDto, DogDto],
			});

			decorator({}, "pet");
		};

		expect(applyDecorator).toThrow("type contains DTO DogDto");
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
