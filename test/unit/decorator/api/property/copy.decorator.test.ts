import "reflect-metadata";

import { ApiPropertyDescribe } from "@decorator/api/property/describe.decorator";
import { ApiPropertyCopy } from "@decorator/api/property/copy.decorator";
import { EApiDtoType, EApiPropertyDescribeType, EApiPropertyNumberType, EApiPropertyStringType, EApiRouteType } from "@enum/decorator/api";
import { SWAGGER_METADATA_CONSTANT } from "@constant/swagger";
import { DTO_SCHEMA_NAME_CONSTANT } from "@constant/utility/dto/schema-name.constant";
import { DtoAutoContextPush } from "@utility/dto/auto/context/push.utility";
import { DtoSchemaNameAssertUnique } from "@utility/dto/schema-name/assert-unique.utility";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { describe, expect, it } from "vitest";

const SWAGGER_EXTRA_MODELS_METADATA_KEY: string = "swagger/apiExtraModels";

@Entity("copy_entities")
class CopyEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({
		description: "id",
		type: EApiPropertyDescribeType.UUID,
	})
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "name",
		exampleValue: "Name",
		format: EApiPropertyStringType.STRING,
		isAutoDtoEnabled: false,
		maxLength: 50,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public name!: string;
}

@Entity("copy_currency_entities")
class CopyCurrencyEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({
		description: "id",
		type: EApiPropertyDescribeType.UUID,
	})
	public id!: string;
}

@Entity("copy_deposit_entities")
class CopyDepositEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({
		description: "id",
		type: EApiPropertyDescribeType.UUID,
	})
	public id!: string;

	@ManyToOne(() => CopyCurrencyEntity)
	@ApiPropertyDescribe({
		description: "currency",
		isAutoDtoEnabled: false,
		type: EApiPropertyDescribeType.RELATION,
	})
	public currency!: CopyCurrencyEntity;
}

@Entity("copy_invalid_relation_entities")
class CopyInvalidRelationEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({
		description: "id",
		type: EApiPropertyDescribeType.UUID,
	})
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "country",
		type: EApiPropertyDescribeType.RELATION,
	})
	public country!: string;
}

@Entity("copy_details_entities")
class CopyDetailsEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({
		description: "id",
		type: EApiPropertyDescribeType.UUID,
	})
	public id!: string;

	@Column({ nullable: true, type: "simple-json" })
	@ApiPropertyDescribe({
		dataType: {
			Owner: {
				kind: { description: "kind", exampleValue: "Owner", format: EApiPropertyStringType.STRING, maxLength: 50, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING },
				score: { description: "score", exampleValue: 5, format: EApiPropertyNumberType.INTEGER, maximum: 10, minimum: 0, multipleOf: 1, type: EApiPropertyDescribeType.NUMBER },
			},
		},
		description: "details",
		discriminator: { mapping: { Owner: "Owner" }, propertyName: "kind", shouldKeepDiscriminatorProperty: true },
		isDynamicallyGenerated: true,
		isNullable: true,
		type: EApiPropertyDescribeType.OBJECT,
	} as never)
	public details?: Record<string, unknown>;
}

@Entity("copy_missing_metadata_entities")
class CopyMissingMetadataEntity {
	@Column({ type: "varchar" })
	public title!: string;
}

@Entity("copy_disabled_entities")
class CopyDisabledEntity {
	@Column({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "label",
		exampleValue: "Label",
		format: EApiPropertyStringType.STRING,
		maxLength: 50,
		minLength: 1,
		pattern: "/^.+$/",
		properties: {
			[EApiRouteType.CREATE]: {
				[EApiDtoType.BODY]: {
					isEnabled: false,
				},
			},
		},
		type: EApiPropertyDescribeType.STRING,
	})
	public label!: string;
}

class CopyPlainEntity {
	@Column({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "title",
		exampleValue: "Title",
		format: EApiPropertyStringType.STRING,
		maxLength: 50,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public title!: string;
}

describe("ApiPropertyCopy", () => {
	it("throws when method and dtoType are missing", () => {
		const buildDto = () => {
			class CopyDto {
				@ApiPropertyCopy({ entity: CopyEntity, propertyName: "name" })
				public name!: string;
			}

			return CopyDto;
		};

		expect(buildDto).toThrow("ApiPropertyCopy requires method and dtoType or a valid autoResolveContext.");
	});

	it("explicitly copies decorators from a globally auto-DTO-hidden scalar property", () => {
		class CopyDto {
			@ApiPropertyCopy({
				entity: CopyEntity,
				propertyName: "name",
				method: EApiRouteType.CREATE,
				dtoType: EApiDtoType.BODY,
			})
			public name!: string;
		}

		const swaggerMetadata = Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES, CopyDto.prototype, "name");
		const errors = validateSync(plainToInstance(CopyDto, { name: 1 }));

		expect(swaggerMetadata).toMatchObject({ description: "CopyEntity name", type: "string" });
		expect(errors.some((error) => error.property === "name")).toBe(true);
	});

	it("explicitly copies a globally auto-DTO-hidden relation into a response DTO", () => {
		class CopyRelationResponseDto {
			@ApiPropertyCopy({
				entity: CopyDepositEntity,
				propertyName: "currency",
				method: EApiRouteType.GET,
				dtoType: EApiDtoType.RESPONSE,
			})
			public currency!: CopyCurrencyEntity;
		}

		const relationMetadata = Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES, CopyRelationResponseDto.prototype, "currency");
		const relationDto = relationMetadata.type;
		const idMetadata = Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES, relationDto.prototype, "id");

		expect(relationMetadata.description).toBe("CopyDepositEntity currency");
		expect(idMetadata.description).toBe("CopyDepositEntity currency identifier");
		expect(idMetadata.description).not.toBe("CopyDepositEntity identifier");
	});

	it("names a copied relation after the host DTO, so two host DTOs that copy one relation keep their names apart", () => {
		class CopyHostOneResponseDTO {
			@ApiPropertyCopy({ dtoType: EApiDtoType.RESPONSE, entity: CopyDepositEntity, method: EApiRouteType.GET, propertyName: "currency" })
			public currency!: CopyCurrencyEntity;
		}

		class CopyHostTwoResponseDTO {
			@ApiPropertyCopy({ dtoType: EApiDtoType.RESPONSE, entity: CopyDepositEntity, method: EApiRouteType.GET, propertyName: "currency" })
			public currency!: CopyCurrencyEntity;
		}

		const relationName = (host: object): string => (Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES, host, "currency") as { type: { name: string } }).type.name;

		expect(relationName(CopyHostOneResponseDTO.prototype)).toBe("CopyHostOneResponseCurrencyDTO");
		expect(relationName(CopyHostTwoResponseDTO.prototype)).toBe("CopyHostTwoResponseCurrencyDTO");
		expect(() =>
			DtoSchemaNameAssertUnique([
				{ origin: "the first host", type: CopyHostOneResponseDTO },
				{ origin: "the second host", type: CopyHostTwoResponseDTO },
			]),
		).not.toThrow();
	});

	it("removes a trailing DTO of the host class in any case, as in the class of the JSDoc example", () => {
		class DepositCallbackRequestBodyDto {
			@ApiPropertyCopy({ dtoType: EApiDtoType.RESPONSE, entity: CopyDepositEntity, method: EApiRouteType.GET, propertyName: "currency" })
			public currency!: CopyCurrencyEntity;
		}

		class CopyLowerCaseResponsedto {
			@ApiPropertyCopy({ dtoType: EApiDtoType.RESPONSE, entity: CopyDepositEntity, method: EApiRouteType.GET, propertyName: "currency" })
			public currency!: CopyCurrencyEntity;
		}

		const relationName = (host: object): string => (Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES, host, "currency") as { type: { name: string } }).type.name;

		expect(relationName(DepositCallbackRequestBodyDto.prototype)).toBe("DepositCallbackRequestBodyCurrencyDTO");
		expect(relationName(CopyLowerCaseResponsedto.prototype)).toBe("CopyLowerCaseResponseCurrencyDTO");
	});

	it("does not repeat the DTO suffix when the host property ends in DTO", () => {
		class CopySuffixResponseDTO {
			@ApiPropertyCopy({ dtoType: EApiDtoType.RESPONSE, entity: CopyDepositEntity, method: EApiRouteType.GET, propertyName: "currency" })
			public currencyDTO!: CopyCurrencyEntity;
		}

		expect((Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES, CopySuffixResponseDTO.prototype, "currencyDTO") as { type: { name: string } }).type.name).toBe("CopySuffixResponseCurrencyDTO");
	});

	it("keeps a host property that is only the DTO suffix, because it is a legal name", () => {
		class CopyDtoNamedResponseDTO {
			@ApiPropertyCopy({ dtoType: EApiDtoType.RESPONSE, entity: CopyDepositEntity, method: EApiRouteType.GET, propertyName: "currency" })
			public dto!: CopyCurrencyEntity;
		}

		expect((Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES, CopyDtoNamedResponseDTO.prototype, "dto") as { type: { name: string } }).type.name).toBe("CopyDtoNamedResponseDtoDTO");
	});

	it("fails naming the host and the property when the host property leaves no name segment", () => {
		expect(() => {
			class CopyEmptySegmentResponseDTO {
				@ApiPropertyCopy({ dtoType: EApiDtoType.RESPONSE, entity: CopyDepositEntity, method: EApiRouteType.GET, propertyName: "currency" })
				public _!: CopyCurrencyEntity;
			}

			return CopyEmptySegmentResponseDTO;
		}).toThrow('Property or variant "_" of CopyEmptySegmentResponseDTO leaves nothing');
	});

	it("names the real host class when a copied relation leaves no name segment", () => {
		expect(() => {
			class CopyRelationEmptySegmentHostDto {
				@ApiPropertyCopy({ dtoType: EApiDtoType.RESPONSE, entity: CopyDepositEntity, method: EApiRouteType.GET, propertyName: "currency" })
				public _!: CopyCurrencyEntity;
			}

			return CopyRelationEmptySegmentHostDto;
		}).toThrow('Property or variant "_" of CopyRelationEmptySegmentHostDto leaves nothing');
	});

	it("names the real host class when a copied dynamic object leaves no name segment", () => {
		expect(() => {
			class CopyDynamicEmptySegmentHost {
				@ApiPropertyCopy({ dtoType: EApiDtoType.RESPONSE, entity: CopyDetailsEntity, method: EApiRouteType.GET, propertyName: "details" })
				public _?: Record<string, unknown>;
			}

			return CopyDynamicEmptySegmentHost;
		}).toThrow('Property or variant "_" of CopyDynamicEmptySegmentHost leaves nothing');
	});

	it("records the real host class as the origin of a copied relation and a copied dynamic object", () => {
		class CopyOriginHostDto {
			@ApiPropertyCopy({ dtoType: EApiDtoType.RESPONSE, entity: CopyDepositEntity, method: EApiRouteType.GET, propertyName: "currency" })
			public currency!: CopyCurrencyEntity;

			@ApiPropertyCopy({ dtoType: EApiDtoType.RESPONSE, entity: CopyDetailsEntity, method: EApiRouteType.GET, propertyName: "details" })
			public details?: Record<string, unknown>;
		}

		const relation: { type: object } = Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES, CopyOriginHostDto.prototype, "currency") as { type: object };
		const variants: Array<object> = Reflect.getMetadata(SWAGGER_EXTRA_MODELS_METADATA_KEY, CopyOriginHostDto) as Array<object>;

		expect(Reflect.getMetadata(DTO_SCHEMA_NAME_CONSTANT.ORIGIN_METADATA_KEY, relation.type)).toBe("relation property currency in CopyOriginHostDto");
		expect(variants.map((variant: object): unknown => Reflect.getMetadata(DTO_SCHEMA_NAME_CONSTANT.ORIGIN_METADATA_KEY, variant))).toContain("variant Owner of property details in CopyOriginHostDto");
	});

	it("registers the variants of a copied dynamic object on the host DTO, so their components exist", () => {
		class CopyRegisteredHostDTO {
			@ApiPropertyCopy({ dtoType: EApiDtoType.RESPONSE, entity: CopyDetailsEntity, method: EApiRouteType.GET, propertyName: "details" })
			public details?: Record<string, unknown>;
		}

		expect((Reflect.getMetadata(SWAGGER_EXTRA_MODELS_METADATA_KEY, CopyRegisteredHostDTO) as Array<{ name: string }>).map(({ name }: { name: string }): string => name)).toContain("CopyRegisteredHostDetailsOwnerDTO");
	});

	it("registers no extra models for a copied scalar property", () => {
		class CopyScalarHostDTO {
			@ApiPropertyCopy({ dtoType: EApiDtoType.RESPONSE, entity: CopyEntity, method: EApiRouteType.GET, propertyName: "id" })
			public id!: string;
		}

		expect(Reflect.getMetadata(SWAGGER_EXTRA_MODELS_METADATA_KEY, CopyScalarHostDTO)).toBeUndefined();
	});

	it("names the variants of a copied dynamic object after the host DTO and its property", () => {
		class CopyDetailsHostDTO {
			@ApiPropertyCopy({ dtoType: EApiDtoType.RESPONSE, entity: CopyDetailsEntity, method: EApiRouteType.GET, propertyName: "details" })
			public details?: Record<string, unknown>;
		}

		class CopyDetailsOtherHostDTO {
			@ApiPropertyCopy({ dtoType: EApiDtoType.RESPONSE, entity: CopyDetailsEntity, method: EApiRouteType.GET, propertyName: "details" })
			public details?: Record<string, unknown>;
		}

		const variantReference = (host: object): string | undefined => (Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES, host, "details") as { oneOf: Array<{ $ref: string }> }).oneOf[0]?.$ref;

		expect(variantReference(CopyDetailsHostDTO.prototype)).toBe("#/components/schemas/CopyDetailsHostDetailsOwnerDTO");
		expect(variantReference(CopyDetailsOtherHostDTO.prototype)).toBe("#/components/schemas/CopyDetailsOtherHostDetailsOwnerDTO");
	});

	it("names one relation copied into two properties of one host DTO after each host property", () => {
		class CopyHostTwiceResponseDTO {
			@ApiPropertyCopy({ dtoType: EApiDtoType.RESPONSE, entity: CopyDepositEntity, method: EApiRouteType.GET, propertyName: "currency" })
			public currency!: CopyCurrencyEntity;

			@ApiPropertyCopy({ dtoType: EApiDtoType.RESPONSE, entity: CopyDepositEntity, metadata: { description: "previous currency" }, method: EApiRouteType.GET, propertyName: "currency" })
			public previousCurrency!: CopyCurrencyEntity;
		}

		const relation = (key: string): { description: string; type: { name: string } } => Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES, CopyHostTwiceResponseDTO.prototype, key) as { description: string; type: { name: string } };

		expect(relation("currency").type.name).toBe("CopyHostTwiceResponseCurrencyDTO");
		expect(relation("previousCurrency").type.name).toBe("CopyHostTwiceResponsePreviousCurrencyDTO");
		expect(relation("previousCurrency").description).toContain("previous currency");
		expect(() => DtoSchemaNameAssertUnique([{ origin: "the host", type: CopyHostTwiceResponseDTO }])).not.toThrow();
	});

	it("names the variants of one dynamic object copied into two properties of one host DTO after each host property", () => {
		class CopyDetailsTwiceDTO {
			@ApiPropertyCopy({ dtoType: EApiDtoType.RESPONSE, entity: CopyDetailsEntity, method: EApiRouteType.GET, propertyName: "details" })
			public details?: Record<string, unknown>;

			@ApiPropertyCopy({ dtoType: EApiDtoType.RESPONSE, entity: CopyDetailsEntity, method: EApiRouteType.GET, propertyName: "details" })
			public previousDetails?: Record<string, unknown>;
		}

		const variantReference = (key: string): string | undefined => (Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES, CopyDetailsTwiceDTO.prototype, key) as { oneOf: Array<{ $ref: string }> }).oneOf[0]?.$ref;

		expect(variantReference("details")).toBe("#/components/schemas/CopyDetailsTwiceDetailsOwnerDTO");
		expect(variantReference("previousDetails")).toBe("#/components/schemas/CopyDetailsTwicePreviousDetailsOwnerDTO");
	});

	it("explicitly copies a globally auto-DTO-hidden relation as a request UUID reference", () => {
		class CopyRelationRequestDto {
			@ApiPropertyCopy({
				entity: CopyDepositEntity,
				propertyName: "currency",
				method: EApiRouteType.CREATE,
				dtoType: EApiDtoType.BODY,
			})
			public currency!: string;
		}

		const metadata = Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES, CopyRelationRequestDto.prototype, "currency");

		expect(metadata.description).toBe("CopyDepositEntity currency");
		expect(metadata.type).toBe("string");
	});

	it("throws a clear error when relation metadata is missing its TypeORM relation target", () => {
		const buildDto = () => {
			class CopyInvalidRelationDto {
				@ApiPropertyCopy({
					entity: CopyInvalidRelationEntity,
					propertyName: "country",
					method: EApiRouteType.CREATE,
					dtoType: EApiDtoType.BODY,
				})
				public country!: string;
			}

			return CopyInvalidRelationDto;
		};

		expect(buildDto).toThrow("Property CopyInvalidRelationEntity.country is marked as RELATION but TypeORM relation target metadata was not found");
	});

	it("throws when property is not found on entity", () => {
		const buildDto = () => {
			class CopyDto {
				@ApiPropertyCopy({
					entity: CopyEntity,
					propertyName: "missing" as keyof CopyEntity,
					method: EApiRouteType.CREATE,
					dtoType: EApiDtoType.BODY,
				})
				public missing!: string;
			}

			return CopyDto;
		};

		expect(buildDto).toThrow("Property missing not found in entity CopyEntity");
	});

	it("throws when property metadata is missing", () => {
		const buildDto = () => {
			class CopyDto {
				@ApiPropertyCopy({
					entity: CopyMissingMetadataEntity,
					propertyName: "title",
					method: EApiRouteType.CREATE,
					dtoType: EApiDtoType.BODY,
				})
				public title!: string;
			}

			return CopyDto;
		};

		expect(buildDto).toThrow("Metadata for property title in entity CopyMissingMetadataEntity not found");
	});

	it("throws when entity table metadata is missing", () => {
		const buildDto = () => {
			class CopyDto {
				@ApiPropertyCopy({
					entity: CopyPlainEntity,
					propertyName: "title",
					method: EApiRouteType.CREATE,
					dtoType: EApiDtoType.BODY,
				})
				public title!: string;
			}

			return CopyDto;
		};

		expect(buildDto).toThrow("Table for entity CopyPlainEntity not found in metadata storage");
	});

	it("throws when no decorators are generated for property", () => {
		const buildDto = () => {
			class CopyDto {
				@ApiPropertyCopy({
					entity: CopyDisabledEntity,
					propertyName: "label",
					method: EApiRouteType.CREATE,
					dtoType: EApiDtoType.BODY,
				})
				public label!: string;
			}

			return CopyDto;
		};

		expect(buildDto).toThrow("No decorators generated for property label in entity CopyDisabledEntity");
	});

	it("queues execution when auto context is requested without context", () => {
		const buildDto = () => {
			class CopyDto {
				@ApiPropertyCopy({
					entity: CopyEntity,
					propertyName: "name",
					shouldAutoResolveContext: true,
				})
				public name!: string;
			}

			return CopyDto;
		};

		expect(buildDto).not.toThrow();
	});

	it("applies decorators after auto context is pushed", () => {
		class CopyDto {
			@ApiPropertyCopy({
				entity: CopyEntity,
				propertyName: "name",
				shouldAutoResolveContext: true,
			})
			public name!: string;
		}

		DtoAutoContextPush(CopyDto.prototype, EApiRouteType.CREATE, EApiDtoType.BODY);

		const metadata = Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES, CopyDto.prototype, "name");
		expect(metadata).toBeDefined();
	});

	it("applies class-validator decorators from copied metadata", () => {
		class CopyDto {
			@ApiPropertyCopy({
				entity: CopyEntity,
				propertyName: "name",
				method: EApiRouteType.CREATE,
				dtoType: EApiDtoType.BODY,
			})
			public name!: string;
		}

		const instance = plainToInstance(CopyDto, { name: 123 });
		const errors = validateSync(instance);

		expect(errors.length).toBeGreaterThan(0);
	});
});
