import "reflect-metadata";

import { ApiPropertyObject } from "@decorator/api/property/object.decorator";
import { SWAGGER_METADATA_CONSTANT } from "@constant/swagger";
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

class UnboundedResponseArrayDto {
	@ApiPropertyObject({ description: "rows", entity: ObjectEntity, isArray: true, isResponse: true, type: ChildDto })
	public rows!: Array<ChildDto>;
}

describe("ApiPropertyObject", () => {
	it("documents a response array without bounds when it declares none", () => {
		const metadata = Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES, UnboundedResponseArrayDto.prototype, "rows") as Record<string, unknown>;

		expect(metadata.isArray).toBe(true);
		expect(metadata).not.toHaveProperty("maxItems");
		expect(metadata).not.toHaveProperty("minItems");
		expect(metadata).not.toHaveProperty("uniqueItems");
	});

	it("writes swagger metadata for single objects", () => {
		const metadata = Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES, ParentDto.prototype, "payload");

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
		const metadata = Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES, FreeformResponseDto.prototype, "payload");

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
		const metadata = Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES, DiscriminatorDto.prototype, "pet");

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
		["unknown", { kind: "bird" }, /^pets has invalid discriminator value for field 'kind'\. must be one of: (?!.*bird)/u],
	])("rejects %s discriminators inside object arrays", (_caseName: string, pet: Record<string, string>, expectedMessage: RegExp) => {
		const instance = plainToInstance(DiscriminatorArrayDto, {
			pets: [pet, { kind: "cat" }],
		});
		const errors = validateSync(instance);

		expect(errors).toHaveLength(1);
		expect(Object.values(errors[0]?.constraints ?? {}).join(" ")).toMatch(expectedMessage);
	});

	it("handles dynamically generated discriminator mappings", () => {
		const metadata = Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES, DynamicDto.prototype, "dynamic");

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

	describe("array bounds at decoration", () => {
		class ArrayBoundsDto {
			public children!: Array<ChildDto>;
		}

		const BOUNDED_REQUEST_ARRAY: Record<string, unknown> = {
			description: "children",
			entity: ObjectEntity,
			isArray: true,
			isUniqueItems: false,
			maxItems: 2,
			minItems: 0,
			shouldValidateNested: true,
			type: ChildDto,
		};

		// Reflect.apply passes the options the way JavaScript or `any` would, past the property types.
		const decorate = (options: Record<string, unknown>): void => {
			const decorator: PropertyDecorator = Reflect.apply(ApiPropertyObject, undefined, [options]);

			decorator(ArrayBoundsDto.prototype, "children");
		};

		it.each([
			["two bounds", { isUniqueItems: undefined, minItems: undefined }, "'isUniqueItems', 'minItems'"],
			["every bound on an array marked isResponse false", { isResponse: false, isUniqueItems: undefined, maxItems: undefined, minItems: undefined }, "'isUniqueItems', 'maxItems', 'minItems'"],
		])("names the DTO class, the property and the way out when a request array leaves out %s", (_name: string, overrides: Record<string, unknown>, missing: string) => {
			expect(() => decorate({ ...BOUNDED_REQUEST_ARRAY, ...overrides })).toThrow(`ApiPropertyObject error: Request array property 'ArrayBoundsDto.children' must declare ${missing}, or be marked 'isResponse: true' if it is response-only`);
		});

		it.each([
			["maxItems", Number.NaN],
			["maxItems", null],
			["maxItems", Number.POSITIVE_INFINITY],
			["maxItems", 1.5],
			["maxItems", "2"],
			["minItems", Number.NaN],
			["minItems", null],
			["minItems", "0"],
		])("rejects %s set to %s", (name: string, value: unknown) => {
			expect(() => decorate({ ...BOUNDED_REQUEST_ARRAY, [name]: value })).toThrow(`ApiPropertyObject error: Property 'ArrayBoundsDto.children': '${name}' must be a non-negative integer`);
		});

		it.each([
			["a number", 1],
			["a string", "true"],
			["null", null],
		])("rejects isArray set to %s, which would skip the bound checks", (_name: string, isArray: unknown) => {
			expect(() => decorate({ ...BOUNDED_REQUEST_ARRAY, isArray, maxItems: Number.NaN })).toThrow("ApiPropertyObject error: Property 'ArrayBoundsDto.children': 'isArray' must be a boolean");
		});

		it("names the class of a static property", () => {
			const decorator: PropertyDecorator = Reflect.apply(ApiPropertyObject, undefined, [{ ...BOUNDED_REQUEST_ARRAY, minItems: undefined }]);

			expect(() => decorator(ArrayBoundsDto, "children")).toThrow("Request array property 'ArrayBoundsDto.children' must declare 'minItems'");
		});

		it("says so when the class has no name", () => {
			const AnonymousDto: new () => object = (() => class {})();
			const decorator: PropertyDecorator = Reflect.apply(ApiPropertyObject, undefined, [{ ...BOUNDED_REQUEST_ARRAY, minItems: undefined }]);

			expect(AnonymousDto.name).toBe("");
			expect(() => decorator(AnonymousDto.prototype, "children")).toThrow("Request array property '<anonymous class>.children' must declare 'minItems'");
		});

		it("rejects isUniqueItems that is not a boolean", () => {
			expect(() => decorate({ ...BOUNDED_REQUEST_ARRAY, isUniqueItems: null })).toThrow("ApiPropertyObject error: Property 'ArrayBoundsDto.children': 'isUniqueItems' must be a boolean");
		});

		it("rejects a bad value on a response array too, which may only leave a bound out", () => {
			expect(() => decorate({ ...BOUNDED_REQUEST_ARRAY, isResponse: true, isUniqueItems: undefined, maxItems: Number.NaN, minItems: undefined })).toThrow("ApiPropertyObject error: Property 'ArrayBoundsDto.children': 'maxItems' must be a non-negative integer");
		});

		it("keeps the less-than-zero error for a negative bound", () => {
			expect(() => decorate({ ...BOUNDED_REQUEST_ARRAY, minItems: -1 })).toThrow("ApiPropertyObject error: Property 'ArrayBoundsDto.children': 'minItems' is less than 0");
		});

		it.each([
			["a fully bounded request array", BOUNDED_REQUEST_ARRAY],
			["a response array without bounds", { ...BOUNDED_REQUEST_ARRAY, isResponse: true, isUniqueItems: undefined, maxItems: undefined, minItems: undefined }],
		])("accepts %s", (_name: string, options: Record<string, unknown>) => {
			expect(() => decorate(options)).not.toThrow();
		});
	});
});
