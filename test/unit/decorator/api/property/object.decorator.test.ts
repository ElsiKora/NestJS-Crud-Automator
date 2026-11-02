import "reflect-metadata";

import type { TApiPropertyDescribeObjectProperties, TApiPropertyObjectProperties } from "@type/decorator/api/property";
import type { ValidatorOptions } from "class-validator";

import { DtoPropertyFactoryObject } from "@class/utility/dto/property/factory/object.class";
import { ApiPropertyObject } from "@decorator/api/property/object.decorator";
import { EApiDtoType, EApiPropertyDescribeType, EApiRouteType } from "@enum/decorator/api";
import { SWAGGER_METADATA_CONSTANT } from "@constant/swagger";
import { GetRegisteredAutoDtoChildrenRecursive } from "@utility/register-auto-dto-child.utility";
import { instanceToInstance, instanceToPlain, plainToInstance } from "class-transformer";
import { getMetadataStorage, validateSync, ValidationTypes } from "class-validator";
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

class FreeFormRequestDto {
	@ApiPropertyObject({
		description: "payloads",
		entity: ObjectEntity,
		isArray: true,
		isRequired: false,
		isUniqueItems: false,
		maxItems: 3,
		minItems: 0,
		type: Object,
	})
	public payloads?: Array<Record<string, unknown>>;

	@ApiPropertyObject({
		description: "single",
		entity: ObjectEntity,
		isRequired: false,
		type: Object,
	})
	public single?: Record<string, unknown>;

	@ApiPropertyObject({
		description: "undeclared",
		entity: ObjectEntity,
		isRequired: false,
		type: undefined,
	})
	public undeclared?: Record<string, unknown>;
}

class OmittedKeepDto {
	@ApiPropertyObject({
		description: "pet",
		discriminator: {
			mapping: {
				cat: CatDto,
				dog: DogDto,
			},
			propertyName: "kind",
		},
		entity: ObjectEntity,
		isRequired: true,
		shouldValidateNested: true,
		type: [CatDto, DogDto],
	})
	public pet!: CatDto | DogDto;

	@ApiPropertyObject({
		description: "pets",
		discriminator: {
			mapping: {
				cat: CatDto,
				dog: DogDto,
			},
			propertyName: "kind",
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

class OmittedKeepDynamicDto {
	@ApiPropertyObject({
		description: "dynamic",
		discriminator: {
			mapping: {
				cat: "CatDto",
			},
			propertyName: "kind",
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

class FalseKeepResponseDto {
	@ApiPropertyObject({
		description: "pet",
		discriminator: {
			mapping: {
				cat: CatDto,
				dog: DogDto,
			},
			propertyName: "kind",
			shouldKeepDiscriminatorProperty: false,
		},
		entity: ObjectEntity,
		isRequired: true,
		isResponse: true,
		type: [CatDto, DogDto],
	})
	public pet!: CatDto | DogDto;
}

describe("ApiPropertyObject", () => {
	describe("free-form request values", () => {
		const VALUE: Record<string, unknown> = { deep: { junk: true, toString: "kept" }, hasOwnProperty: true, id: 1, valueOf: 2 };

		it.each<{ options: ValidatorOptions }>([{ options: {} }, { options: { whitelist: true } }, { options: { forbidNonWhitelisted: true, whitelist: true } }])("keeps array items, a single object and a class-less object as sent with $options", ({ options }: { options: ValidatorOptions }) => {
			const instance = plainToInstance(FreeFormRequestDto, { payloads: [{ ...VALUE }, { id: 2 }], single: { ...VALUE }, undeclared: { ...VALUE } });

			expect(validateSync(instance, options)).toHaveLength(0);
			expect(instance.payloads).toEqual([VALUE, { id: 2 }]);
			expect(instance.single).toEqual(VALUE);
			expect(instance.undeclared).toEqual(VALUE);
		});

		it("attaches no nested validation to a free-form property or a class-less one", () => {
			const nestedProperties: Array<string> = getMetadataStorage()
				.getTargetValidationMetadatas(FreeFormRequestDto, "", false, false)
				.filter((metadata) => metadata.type === ValidationTypes.NESTED_VALIDATION)
				.map((metadata) => metadata.propertyName);

			expect(nestedProperties).toEqual([]);
		});

		it.each([{ item: 1 }, { item: "x" }, { item: null }, { item: [{ id: 1 }] }])("rejects the array item $item", ({ item }: { item: unknown }) => {
			const errors = validateSync(plainToInstance(FreeFormRequestDto, { payloads: [{ id: 1 }, item] }));

			expect(errors.map((error) => error.constraints)).toEqual([{ isObject: "each value in payloads must be an object" }]);
		});

		it.each([{ property: "single" }, { property: "undeclared" }])("rejects a non-object value of $property", ({ property }: { property: string }) => {
			const errors = validateSync(plainToInstance(FreeFormRequestDto, { [property]: 1 }));

			expect(errors.map((error) => error.constraints)).toEqual([{ isObject: `${property} must be an object` }]);
		});

		it("rejects a non-object item of a class-less array", () => {
			class UndeclaredArrayDto {
				@ApiPropertyObject({
					description: "undeclared",
					entity: ObjectEntity,
					isArray: true,
					isRequired: true,
					isUniqueItems: false,
					maxItems: 3,
					minItems: 0,
					type: undefined,
				})
				public undeclared!: Array<Record<string, unknown>>;
			}

			expect(validateSync(plainToInstance(UndeclaredArrayDto, { undeclared: [{ id: 1 }] }))).toHaveLength(0);
			expect(validateSync(plainToInstance(UndeclaredArrayDto, { undeclared: [1] })).map((error) => error.constraints)).toEqual([{ isObject: "each value in undeclared must be an object" }]);
		});

		it.each([
			{ name: "type Object", type: Object },
			{ name: "no type", type: undefined },
		])("keeps the unique check on an array declared unique with $name, and compares by value", ({ type }: { type: ObjectConstructor | undefined }) => {
			class UniqueFreeFormDto {
				@ApiPropertyObject({
					description: "items",
					entity: ObjectEntity,
					isArray: true,
					isRequired: true,
					isUniqueItems: true,
					maxItems: 3,
					minItems: 0,
					type,
				})
				public items!: Array<Record<string, unknown>>;
			}

			const constraints = (items: Array<unknown>) => validateSync(plainToInstance(UniqueFreeFormDto, { items })).map((error) => error.constraints);

			expect(constraints([{ a: 1 }, { a: 1 }])).toEqual([{ arrayUniqueItems: "items must not contain duplicate items" }]);
			expect(
				constraints([
					{ a: 1, b: 2 },
					{ b: 2, a: 1 },
				]),
			).toEqual([{ arrayUniqueItems: "items must not contain duplicate items" }]);
			expect(constraints([{ a: 1 }, { a: 2 }])).toEqual([]);
		});

		it.each([
			{ name: "type Object", type: Object },
			{ name: "no type", type: undefined },
		])("applies the array option checks at decoration with $name", ({ type }: { type: ObjectConstructor | undefined }) => {
			const decorate = (options: Record<string, unknown>) => (): void => {
				ApiPropertyObject({ description: "items", entity: ObjectEntity, isArray: true, isRequired: true, type, ...options } as never)(class FreeFormBoundsDto {}.prototype, "items");
			};

			expect(decorate({ isUniqueItems: false, maxItems: 3 })).toThrow("Request array property 'FreeFormBoundsDto.items' must declare 'minItems'");
			expect(decorate({ isUniqueItems: false, maxItems: Number.NaN, minItems: 0 })).toThrow("'maxItems' must be a non-negative integer");
			expect(decorate({ isUniqueItems: true, maxItems: 1, minItems: 0 })).toThrow("'uniqueItems' is true but 'maxItems' is less than or equal to 1");
			expect(decorate({ isUniqueItems: false, maxItems: 3, minItems: 0, shouldValidateNested: false })).not.toThrow();
		});

		it.each([
			{ name: "type Object", type: Object },
			{ name: "no type", type: undefined },
		])("does not need shouldValidateNested on an array with $name", ({ type }: { type: ObjectConstructor | undefined }) => {
			class NoNestedOptionDto {
				@ApiPropertyObject({ description: "items", entity: ObjectEntity, isArray: true, isRequired: true, isUniqueItems: false, maxItems: 3, minItems: 0, type } as never)
				public items!: Array<Record<string, unknown>>;
			}

			const instance = plainToInstance(NoNestedOptionDto, { items: [{ ...VALUE }] });

			expect(validateSync(instance, { forbidNonWhitelisted: true, whitelist: true })).toEqual([]);
			expect(instance.items).toEqual([VALUE]);
		});

		it.each([
			{ isArray: false, isResponse: false, name: "type Object", type: Object },
			{ isArray: true, isResponse: false, name: "type Object on an array", type: Object },
			{ isArray: false, isResponse: true, name: "type Object on a response", type: Object },
			{ isArray: false, isResponse: false, name: "no type", type: undefined },
			{ isArray: true, isResponse: false, name: "no type on an array", type: undefined },
		])("refuses shouldValidateNested: true with $name, naming the class and property", ({ isArray, isResponse, type }: { isArray: boolean; isResponse: boolean; type: ObjectConstructor | undefined }) => {
			const decorate = (): void => {
				ApiPropertyObject({ description: "value", entity: ObjectEntity, isArray, isRequired: true, isResponse, isUniqueItems: false, maxItems: 3, minItems: 0, shouldValidateNested: true, type } as never)(class FreeFormNestedDto {}.prototype, "value");
			};

			expect(decorate).toThrow("'FreeFormNestedDto.value' cannot set 'shouldValidateNested' to true");
		});

		it.each<{ discriminator?: object; name: string; options?: object; type: Array<unknown> }>([
			{ name: "[Object]", type: [Object] },
			{ name: "[Object] on an array", options: { isArray: true, isUniqueItems: false, maxItems: 3, minItems: 0 }, type: [Object] },
			{ name: "Object among classes", type: [Object, ChildDto] },
			{ discriminator: { mapping: { cat: CatDto }, propertyName: "kind" }, name: "Object among discriminated classes", type: [Object, CatDto] },
		])("refuses $name as a type, naming the class and property", ({ discriminator, options, type }: { discriminator?: object; options?: object; type: Array<unknown> }) => {
			const decorate = (): void => {
				ApiPropertyObject({ description: "value", discriminator, entity: ObjectEntity, isRequired: true, shouldValidateNested: true, type, ...options } as never)(class ObjectTupleDto {}.prototype, "value");
			};

			expect(decorate).toThrow("'ObjectTupleDto.value' cannot list Object in 'type'");
		});

		it.each([
			{ name: "type Object", type: Object },
			{ name: "no type", type: undefined },
		])("publishes an open object for a request and a response value with $name", ({ type }: { type: ObjectConstructor | undefined }) => {
			class PublishedDto {
				@ApiPropertyObject({ description: "request", entity: ObjectEntity, isRequired: true, type } as never)
				public request!: Record<string, unknown>;

				@ApiPropertyObject({ description: "response", entity: ObjectEntity, isRequired: true, isResponse: true, type } as never)
				public response!: Record<string, unknown>;
			}

			for (const property of ["request", "response"]) {
				expect(Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES, PublishedDto.prototype, property).type).toBe(Object);
			}
		});

		it.each([
			{ name: "type Object", type: Object },
			{ name: "no type", type: undefined },
		])("keeps prototype-named keys of a value with $name", ({ type }: { type: ObjectConstructor | undefined }) => {
			class TransformedDto {
				@ApiPropertyObject({ description: "value", entity: ObjectEntity, isRequired: true, type } as never)
				public value!: Record<string, unknown>;
			}

			expect(plainToInstance(TransformedDto, { value: { ...VALUE } }).value).toEqual(VALUE);
		});

		it("refuses shouldValidateNested: true on a generated free-form property, naming the generated DTO", () => {
			const decorator = new DtoPropertyFactoryObject<ObjectEntity>().create({ dataType: Object, description: "value", shouldValidateNested: true, type: EApiPropertyDescribeType.OBJECT } as never, { name: "ObjectEntity" } as never, {} as never, EApiRouteType.CREATE, EApiDtoType.BODY, "value");

			expect(() => {
				decorator(class GeneratedBodyDto {}.prototype, "value");
			}).toThrow("'GeneratedBodyDto.value' cannot set 'shouldValidateNested' to true");
		});

		it("says in the types what a free-form value and a declared class allow", () => {
			const entity: typeof ObjectEntity = ObjectEntity;

			const allowed: Array<TApiPropertyObjectProperties> = [
				{ description: "free-form", entity, isRequired: true, type: Object },
				{ description: "free-form", entity, isRequired: true, shouldValidateNested: false, type: undefined },
				{ description: "free-form", entity, isArray: true, isRequired: true, isUniqueItems: false, maxItems: 3, minItems: 0, type: Object },
				{ description: "declared", entity, isRequired: true, shouldValidateNested: true, type: ChildDto },
				{ description: "declared", entity, isRequired: true, shouldValidateNested: true, type: [ChildDto] },
				{ description: "polymorphic", discriminator: { mapping: { cat: CatDto, dog: DogDto }, propertyName: "kind" }, entity, isRequired: true, shouldValidateNested: true, type: [CatDto, DogDto] },
			];

			const refused: Array<TApiPropertyObjectProperties> = [
				// @ts-expect-error a free-form value declares no class to validate against
				{ description: "free-form", entity, isRequired: true, shouldValidateNested: true, type: Object },
				// @ts-expect-error a value with no type declares no class to validate against
				{ description: "free-form", entity, isRequired: true, shouldValidateNested: true, type: undefined },
				// @ts-expect-error Object is not a class to hold in a tuple
				{ description: "tuple", entity, isRequired: true, type: [Object] },
				// @ts-expect-error Object is not a variant of a polymorphic value
				{ description: "polymorphic", discriminator: { mapping: { cat: CatDto }, propertyName: "kind" }, entity, isRequired: true, type: [Object, CatDto] },
				// @ts-expect-error omitting the key does not mean free-form, only an explicit undefined does
				{ description: "free-form", entity, isRequired: true },
			];

			const described: Array<TApiPropertyDescribeObjectProperties> = [
				{ dataType: Object, description: "free-form", type: EApiPropertyDescribeType.OBJECT },
				{ dataType: undefined, description: "free-form", type: EApiPropertyDescribeType.OBJECT },
				{ dataType: ChildDto, description: "declared", shouldValidateNested: true, type: EApiPropertyDescribeType.OBJECT },
				// @ts-expect-error a free-form value declares no class to validate against
				{ dataType: Object, description: "free-form", shouldValidateNested: true, type: EApiPropertyDescribeType.OBJECT },
				// @ts-expect-error Object is not a class to hold in a tuple
				{ dataType: [Object], description: "tuple", type: EApiPropertyDescribeType.OBJECT },
			];

			expect(allowed.length + refused.length + described.length).toBeGreaterThan(0);
		});

		it("still attaches nested validation to a declared class", () => {
			const nestedProperties: Array<string> = getMetadataStorage()
				.getTargetValidationMetadatas(ObjectArrayDto, "", false, false)
				.filter((metadata) => metadata.type === ValidationTypes.NESTED_VALIDATION)
				.map((metadata) => metadata.propertyName);

			expect(nestedProperties).toEqual(["payloads"]);
		});
	});

	describe("shouldKeepDiscriminatorProperty", () => {
		it("keeps the discriminator and validates when the option is omitted", () => {
			const instance = plainToInstance(OmittedKeepDto, { pet: { kind: "cat" }, pets: [{ kind: "dog" }] });

			expect(validateSync(instance)).toHaveLength(0);
			expect(instance.pet).toBeInstanceOf(CatDto);
			expect(instance.pet.kind).toBe("cat");
			expect(instance.pets[0]).toBeInstanceOf(DogDto);
			expect(instance.pets[0]?.kind).toBe("dog");
		});

		it("keeps the discriminator on a dynamically generated property when the option is omitted", () => {
			const instance = plainToInstance(OmittedKeepDynamicDto, { dynamic: { kind: "cat" } });

			expect(validateSync(instance)).toHaveLength(0);
			expect(instance.dynamic).toBeInstanceOf(CatDto);
			expect(instance.dynamic.kind).toBe("cat");
		});

		it("rejects false on a property that is not marked as a response, whatever else it declares", () => {
			const applyDecorator = (): void => {
				class FalseKeepRequestDto {
					@ApiPropertyObject({
						description: "pet",
						discriminator: {
							mapping: {
								cat: CatDto,
								dog: DogDto,
							},
							propertyName: "kind",
							shouldKeepDiscriminatorProperty: false,
						},
						entity: ObjectEntity,
						isRequired: true,
						isResponse: false,
						type: [CatDto, DogDto],
					})
					public pet!: CatDto | DogDto;
				}

				expect(FalseKeepRequestDto).toBeDefined();
			};

			expect(applyDecorator).toThrow("ApiPropertyObject error: Request property 'FalseKeepRequestDto.pet' cannot set 'discriminator.shouldKeepDiscriminatorProperty' to false: a removed discriminator cannot be validated. Leave the option out. A manual DTO property that is only returned sets 'isResponse: true'; a generated write body that should not carry it sets 'properties[route][BODY].isEnabled: false'");
		});

		it("removes the discriminator from a response property with false, from the source object too", () => {
			const source = { pet: { kind: "cat" } };
			const instance = plainToInstance(FalseKeepResponseDto, source);

			expect(instance.pet).toBeInstanceOf(CatDto);
			expect(instance.pet.kind).toBeUndefined();
			expect(source.pet).not.toHaveProperty("kind");
		});

		it("writes the discriminator of a response property with false back in instanceToPlain", () => {
			const instance = plainToInstance(FalseKeepResponseDto, { pet: { kind: "cat" } });

			expect(instanceToPlain(instance)).toEqual({ pet: { kind: "cat" } });
		});
	});

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
				type: ChildDto,
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
