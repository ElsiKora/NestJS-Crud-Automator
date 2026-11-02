import "reflect-metadata";

import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiControllerGetListQueryPlan } from "@interface/class/api/controller/get-list/query";
import type { ClassConstructor } from "class-transformer";
import type { TApiPropertyDescribeProperties } from "@type/decorator/api/property";

import { ApiPropertyEnum } from "@decorator/api/property/enum.decorator";
import { ApiPropertyObject } from "@decorator/api/property/object.decorator";
import { ApiPropertyString } from "@decorator/api/property/string.decorator";
import { ApiPropertyDescribe } from "@decorator/api/property/describe.decorator";
import { EApiDtoType, EApiPropertyDateIdentifier, EApiPropertyDateType, EApiPropertyDescribeType, EApiPropertyNumberType, EApiPropertyStringType, EApiRouteType } from "@enum/decorator/api";
import { EFilterOperation, EFilterOperationString, EFilterOperationUuid } from "@enum/filter";
import { ValidationPipe } from "@nestjs/common";
import { SWAGGER_METADATA_CONSTANT } from "@constant/swagger";
import { DtoGenerate } from "@utility/dto/generate/core.utility";
import { GenerateEntityInformation } from "@utility/generate-entity-information.utility";
import { instanceToPlain, plainToInstance } from "class-transformer";
import { getMetadataStorage, validateSync } from "class-validator";
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { describe, expect, it } from "vitest";

import { DtoRelatedGroupEntity, DtoRelatedMetaInfo } from "./fixture/dto-related";

enum TestStatus {
	ACTIVE = "ACTIVE",
	INACTIVE = "INACTIVE",
}

enum ManualPolicyEffect {
	ALLOW = "Allow",
	DENY = "Deny",
}

class ManualPolicyPrincipalDto {
	@ApiPropertyString({
		description: "AWS",
		entity: ManualPolicyPrincipalDto,
		exampleValue: "arn:aws:iam::123456789012:root",
		format: EApiPropertyStringType.STRING,
		maxLength: 128,
		minLength: 1,
		pattern: "/^.+$/",
	})
	public AWS!: string;
}

class ManualPolicyStatementDto {
	@ApiPropertyEnum({
		description: "Effect",
		entity: ManualPolicyStatementDto,
		enum: ManualPolicyEffect,
		enumName: "ManualPolicyEffect",
		isRequired: true,
	})
	public Effect!: ManualPolicyEffect;

	@ApiPropertyObject({
		description: "Condition",
		entity: ManualPolicyStatementDto,
		isRequired: false,
		type: Object,
	})
	public Condition?: Record<string, Record<string, unknown>>;

	@ApiPropertyObject({
		description: "Principal",
		entity: ManualPolicyStatementDto,
		isRequired: true,
		shouldValidateNested: true,
		type: ManualPolicyPrincipalDto,
	})
	public Principal!: ManualPolicyPrincipalDto;
}

class ManualPolicyDocumentDto {
	@ApiPropertyString({
		description: "Version",
		entity: ManualPolicyDocumentDto,
		exampleValue: "2012-10-17",
		format: EApiPropertyStringType.STRING,
		maxLength: 32,
		minLength: 1,
		pattern: "/^.+$/",
	})
	public Version!: string;

	@ApiPropertyObject({
		description: "Statement",
		entity: ManualPolicyDocumentDto,
		isArray: true,
		isRequired: true,
		isUniqueItems: false,
		maxItems: 10,
		minItems: 1,
		shouldValidateNested: true,
		type: ManualPolicyStatementDto,
	})
	public Statement!: Array<ManualPolicyStatementDto>;
}

@Entity("dto_related_entities")
class DtoRelatedEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({
		description: "id",
		isAutoDtoEnabled: false,
		type: EApiPropertyDescribeType.UUID,
	})
	public id!: string;

	@Column({ type: "uuid" })
	@ApiPropertyDescribe({
		description: "external id",
		type: EApiPropertyDescribeType.UUID,
	})
	public externalId!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "owner name",
		exampleValue: "Owner",
		format: EApiPropertyStringType.STRING,
		maxLength: 50,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public name!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "hidden owner name",
		format: EApiPropertyStringType.STRING,
		isAutoDtoEnabled: false,
		maxLength: 50,
		minLength: 1,
		pattern: "/^.+$/",
		properties: {
			[EApiRouteType.GET_LIST]: {
				[EApiDtoType.QUERY]: {
					isEnabled: true,
				},
			},
		},
		type: EApiPropertyDescribeType.STRING,
	} as TApiPropertyDescribeProperties)
	public hiddenName!: string;

	@Column({ type: "json", nullable: true })
	// eslint-disable-next-line @elsikora/typescript/no-explicit-any
	@ApiPropertyDescribe({
		dataType: DtoRelatedMetaInfo,
		description: "owner metadata",
		type: EApiPropertyDescribeType.OBJECT,
	} as any)
	public metadata?: DtoRelatedMetaInfo;

	@ManyToOne(() => DtoRelatedGroupEntity)
	@ApiPropertyDescribe({
		description: "owner group",
		type: EApiPropertyDescribeType.RELATION,
	})
	public group!: DtoRelatedGroupEntity;
}

class MetaInfo {
	public note?: string;
}

@Entity("dto_entities")
class DtoEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({
		description: "id",
		type: EApiPropertyDescribeType.UUID,
	})
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "name",
		exampleValue: "Sample",
		format: EApiPropertyStringType.STRING,
		maxLength: 50,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public name!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "internal reference",
		exampleValue: "internal-1",
		format: EApiPropertyStringType.STRING,
		isAutoDtoEnabled: false,
		maxLength: 64,
		minLength: 1,
		pattern: "/^.+$/",
		properties: {
			[EApiRouteType.CREATE]: {
				[EApiDtoType.BODY]: { isEnabled: true },
			},
			[EApiRouteType.GET_LIST]: {
				[EApiDtoType.QUERY]: { isEnabled: true },
				[EApiDtoType.RESPONSE]: { isEnabled: true },
			},
		},
		type: EApiPropertyDescribeType.STRING,
	} as TApiPropertyDescribeProperties)
	public internalReference!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "email",
		exampleValue: "user@example.com",
		format: EApiPropertyStringType.EMAIL,
		maxLength: 255,
		minLength: 5,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public email!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "website",
		exampleValue: "https://example.com",
		format: EApiPropertyStringType.URL,
		maxLength: 255,
		minLength: 5,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public website!: string;

	@Column({ type: "int" })
	@ApiPropertyDescribe({
		description: "count",
		exampleValue: 10,
		format: EApiPropertyNumberType.INTEGER,
		maximum: 100,
		minimum: 0,
		multipleOf: 1,
		type: EApiPropertyDescribeType.NUMBER,
	})
	public count!: number;

	@Column({ type: "double precision" })
	@ApiPropertyDescribe({
		description: "ratio",
		exampleValue: 0.5,
		format: EApiPropertyNumberType.DOUBLE,
		maximum: 1,
		minimum: 0,
		multipleOf: 0.1,
		type: EApiPropertyDescribeType.NUMBER,
	})
	public ratio!: number;

	@Column({ type: "boolean" })
	@ApiPropertyDescribe({
		description: "active",
		type: EApiPropertyDescribeType.BOOLEAN,
	})
	public active!: boolean;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "status",
		enum: TestStatus,
		enumName: "TestStatus",
		type: EApiPropertyDescribeType.ENUM,
	})
	public status!: TestStatus;

	@Column({ type: "timestamp" })
	@ApiPropertyDescribe({
		format: EApiPropertyDateType.DATE_TIME,
		identifier: EApiPropertyDateIdentifier.CREATED_AT,
		type: EApiPropertyDescribeType.DATE,
	})
	public createdAt!: Date;

	@Column({ type: "json", nullable: true })
	// eslint-disable-next-line @elsikora/typescript/no-explicit-any
	@ApiPropertyDescribe({
		dataType: MetaInfo,
		description: "metadata",
		shouldValidateNested: true,
		type: EApiPropertyDescribeType.OBJECT,
	} as any)
	public metadata?: MetaInfo;

	@Column({ type: "json", nullable: true })
	// eslint-disable-next-line @elsikora/typescript/no-explicit-any
	@ApiPropertyDescribe({
		dataType: {
			Variant: {
				kind: {
					description: "kind",
					exampleValue: "Variant",
					format: EApiPropertyStringType.STRING,
					maxLength: 50,
					minLength: 1,
					pattern: "/^.+$/",
					type: EApiPropertyDescribeType.STRING,
				},
				label: {
					description: "label",
					exampleValue: "value",
					format: EApiPropertyStringType.STRING,
					maxLength: 50,
					minLength: 1,
					pattern: "/^.+$/",
					type: EApiPropertyDescribeType.STRING,
				},
				score: {
					description: "score",
					exampleValue: 5,
					format: EApiPropertyNumberType.INTEGER,
					maximum: 10,
					minimum: 0,
					multipleOf: 1,
					type: EApiPropertyDescribeType.NUMBER,
				},
			},
		},
		description: "dynamic",
		discriminator: {
			mapping: {
				Variant: "Variant",
			},
			propertyName: "kind",
			shouldKeepDiscriminatorProperty: true,
		},
		isDynamicallyGenerated: true,
		type: EApiPropertyDescribeType.OBJECT,
	} as any)
	public dynamic?: Record<string, unknown>;

	@ManyToOne(() => DtoRelatedEntity)
	@ApiPropertyDescribe({
		description: "owner",
		type: EApiPropertyDescribeType.RELATION,
	})
	public owner!: DtoRelatedEntity;
}

const NESTED_RELATION_OWNER_DESCRIBE = {
	description: "owner",
	type: EApiPropertyDescribeType.RELATION,
} as const;

const NESTED_RELATION_KIND_DESCRIBE = {
	description: "kind",
	exampleValue: "V1",
	format: EApiPropertyStringType.STRING,
	maxLength: 50,
	minLength: 1,
	pattern: "/^.+$/",
	type: EApiPropertyDescribeType.STRING,
} as const;

@Entity("nested_relation_dto_entities")
class NestedRelationDtoEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({
		description: "id",
		type: EApiPropertyDescribeType.UUID,
	})
	public id!: string;

	@Column({ type: "json", nullable: true })
	// eslint-disable-next-line @elsikora/typescript/no-explicit-any
	@ApiPropertyDescribe({
		dataType: {
			V1: {
				meta: {
					dataType: {
						M1: {
							kind: NESTED_RELATION_KIND_DESCRIBE,
							owner: NESTED_RELATION_OWNER_DESCRIBE,
						},
					},
					description: "meta",
					discriminator: { mapping: { M1: "M1" }, propertyName: "kind", shouldKeepDiscriminatorProperty: true },
					isDynamicallyGenerated: true,
					type: EApiPropertyDescribeType.OBJECT,
				},
				kind: NESTED_RELATION_KIND_DESCRIBE,
				owner: NESTED_RELATION_OWNER_DESCRIBE,
			},
			"v2-beta": {
				kind: NESTED_RELATION_KIND_DESCRIBE,
				owner: NESTED_RELATION_OWNER_DESCRIBE,
			},
		},
		description: "details",
		discriminator: { mapping: { V1: "V1", "v2-beta": "v2-beta" }, propertyName: "kind", shouldKeepDiscriminatorProperty: true },
		isDynamicallyGenerated: true,
		type: EApiPropertyDescribeType.OBJECT,
	} as any)
	public details?: Record<string, unknown>;

	@ManyToOne(() => DtoRelatedEntity)
	@ApiPropertyDescribe(NESTED_RELATION_OWNER_DESCRIBE)
	public owner!: DtoRelatedEntity;

	@ManyToOne(() => DtoRelatedEntity)
	@ApiPropertyDescribe(NESTED_RELATION_OWNER_DESCRIBE)
	// eslint-disable-next-line @elsikora/typescript/naming-convention
	public created_by!: DtoRelatedEntity;

	@ManyToOne(() => DtoRelatedEntity)
	@ApiPropertyDescribe(NESTED_RELATION_OWNER_DESCRIBE)
	public userID!: DtoRelatedEntity;
}

@Entity("timestamp_dto_entities")
class TimestampDtoEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({
		description: "id",
		type: EApiPropertyDescribeType.UUID,
	})
	public id!: string;

	@Column({ type: "timestamp" })
	@ApiPropertyDescribe({
		format: EApiPropertyDateType.DATE_TIME,
		identifier: EApiPropertyDateIdentifier.CREATED_AT,
		type: EApiPropertyDescribeType.DATE,
	})
	public insertedOn!: Date;

	@Column({ type: "timestamp" })
	@ApiPropertyDescribe({
		format: EApiPropertyDateType.DATE_TIME,
		identifier: EApiPropertyDateIdentifier.RECEIVED_AT,
		type: EApiPropertyDescribeType.DATE,
	})
	public receivedOn!: Date;

	@Column({ type: "timestamp" })
	@ApiPropertyDescribe({
		format: EApiPropertyDateType.DATE_TIME,
		identifier: EApiPropertyDateIdentifier.UPDATED_AT,
		type: EApiPropertyDescribeType.DATE,
	})
	public modifiedOn!: Date;

	@Column({ type: "timestamp" })
	@ApiPropertyDescribe({
		format: EApiPropertyDateType.DATE_TIME,
		identifier: EApiPropertyDateIdentifier.DATE,
		type: EApiPropertyDescribeType.DATE,
	})
	public createdAt!: Date;
}

@Entity("manual_nested_policy_entities")
class ManualNestedPolicyEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({
		description: "id",
		type: EApiPropertyDescribeType.UUID,
	})
	public id!: string;

	@Column({ type: "json", nullable: true })
	// eslint-disable-next-line @elsikora/typescript/no-explicit-any
	@ApiPropertyDescribe({
		dataType: ManualPolicyDocumentDto,
		description: "document",
		isNullable: true,
		shouldValidateNested: true,
		type: EApiPropertyDescribeType.OBJECT,
	} as any)
	public document?: ManualPolicyDocumentDto;
}

describe("DtoGenerate", () => {
	it("starts every generated DTO name with the schema prefix, so two controllers on one entity never share a component name", () => {
		const entityMetadata = GenerateEntityInformation<DtoEntity>(DtoEntity as unknown as IApiBaseEntity);
		const firstResponseDto = DtoGenerate(DtoEntity, entityMetadata, EApiRouteType.GET, EApiDtoType.RESPONSE, "FirstDto");
		const firstResponseDtoCached = DtoGenerate(DtoEntity, entityMetadata, EApiRouteType.GET, EApiDtoType.RESPONSE, "FirstDto");
		const secondResponseDto = DtoGenerate(DtoEntity, entityMetadata, EApiRouteType.GET, EApiDtoType.RESPONSE, "SecondDto");
		const secondListResponseDto = DtoGenerate(DtoEntity, entityMetadata, EApiRouteType.GET_LIST, EApiDtoType.RESPONSE, "SecondDto");

		if (!firstResponseDto || !secondResponseDto || !secondListResponseDto) {
			throw new Error("Expected generated response DTOs.");
		}

		const getNestedNames = (dto: ClassConstructor<unknown>): Array<string> => {
			const ownerType: { name: string } = (Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES, dto.prototype, "owner") as { type: { name: string } }).type;
			const extraModels: Array<{ name: string }> = (Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.EXTRA_MODELS, dto) as Array<{ name: string }> | undefined) ?? [];

			return [ownerType.name, ...extraModels.map((model: { name: string }): string => model.name)];
		};

		expect(firstResponseDtoCached).toBe(firstResponseDto);
		expect(secondResponseDto).not.toBe(firstResponseDto);
		expect(firstResponseDto.name).toBe("FirstDtoGetResponseDTO");
		expect(secondResponseDto.name).toBe("SecondDtoGetResponseDTO");
		expect(secondListResponseDto.name).toBe("SecondDtoGetListPageDTO");
		expect(getNestedNames(firstResponseDto)).toEqual(["FirstDtoGetResponseOwnerDTO", "FirstDtoGetResponseDynamicVariantDTO"]);
		expect(getNestedNames(secondResponseDto)).toEqual(["SecondDtoGetResponseOwnerDTO", "SecondDtoGetResponseDynamicVariantDTO"]);
	});

	it("names every nested generated DTO after its parent DTO and property, so a relation inside an object variant keeps apart from the same relation at the root", () => {
		const entityMetadata = GenerateEntityInformation<NestedRelationDtoEntity>(NestedRelationDtoEntity as unknown as IApiBaseEntity);
		const responseDto: ClassConstructor<unknown> | undefined = DtoGenerate(NestedRelationDtoEntity, entityMetadata, EApiRouteType.GET, EApiDtoType.RESPONSE, "NestedRelation") as ClassConstructor<unknown> | undefined;
		const getPropertyTypeName = (dto: ClassConstructor<unknown> | undefined, propertyName: string): string | undefined => (Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES, dto?.prototype ?? {}, propertyName) as { type?: { name: string } } | undefined)?.type?.name;
		const getExtraModel = (dto: ClassConstructor<unknown> | undefined, name: string): ClassConstructor<unknown> | undefined => ((Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.EXTRA_MODELS, dto ?? {}) as Array<ClassConstructor<unknown>> | undefined) ?? []).find((model: ClassConstructor<unknown>): boolean => model.name === name);
		const detailsVariant: ClassConstructor<unknown> | undefined = getExtraModel(responseDto, "NestedRelationGetResponseDetailsV1DTO");
		const metaVariant: ClassConstructor<unknown> | undefined = getExtraModel(detailsVariant, "NestedRelationGetResponseDetailsV1MetaM1DTO");

		expect(getPropertyTypeName(responseDto, "owner")).toBe("NestedRelationGetResponseOwnerDTO");
		expect(detailsVariant).toBeDefined();
		expect(getPropertyTypeName(detailsVariant, "owner")).toBe("NestedRelationGetResponseDetailsV1OwnerDTO");
		expect(metaVariant).toBeDefined();
		expect(getPropertyTypeName(metaVariant, "owner")).toBe("NestedRelationGetResponseDetailsV1MetaM1OwnerDTO");
	});

	it("builds every nested name segment from the property or variant name with separators removed and every other letter kept as written", () => {
		const entityMetadata = GenerateEntityInformation<NestedRelationDtoEntity>(NestedRelationDtoEntity as unknown as IApiBaseEntity);
		const responseDto: ClassConstructor<unknown> | undefined = DtoGenerate(NestedRelationDtoEntity, entityMetadata, EApiRouteType.GET, EApiDtoType.RESPONSE, "NestedRelation") as ClassConstructor<unknown> | undefined;
		const getPropertyTypeName = (dto: ClassConstructor<unknown> | undefined, propertyName: string): string | undefined => (Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES, dto?.prototype ?? {}, propertyName) as { type?: { name: string } } | undefined)?.type?.name;
		const betaVariant: ClassConstructor<unknown> | undefined = ((Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.EXTRA_MODELS, responseDto ?? {}) as Array<ClassConstructor<unknown>> | undefined) ?? []).find((model: ClassConstructor<unknown>): boolean => model.name === "NestedRelationGetResponseDetailsV2BetaDTO");

		expect(getPropertyTypeName(responseDto, "created_by")).toBe("NestedRelationGetResponseCreatedByDTO");
		expect(getPropertyTypeName(responseDto, "userID")).toBe("NestedRelationGetResponseUserIDDTO");
		expect(betaVariant).toBeDefined();
		expect(getPropertyTypeName(betaVariant, "owner")).toBe("NestedRelationGetResponseDetailsV2BetaOwnerDTO");
	});

	it("generates cached DTOs for request, query, and response types", () => {
		const entityMetadata = GenerateEntityInformation<DtoEntity>(DtoEntity as unknown as IApiBaseEntity);

		const createBodyDto = DtoGenerate(DtoEntity, entityMetadata, EApiRouteType.CREATE, EApiDtoType.BODY, "TestController");
		const createBodyDtoCached = DtoGenerate(DtoEntity, entityMetadata, EApiRouteType.CREATE, EApiDtoType.BODY, "TestController");
		const queryDto = DtoGenerate(DtoEntity, entityMetadata, EApiRouteType.GET_LIST, EApiDtoType.QUERY, "TestController");
		const responseDto = DtoGenerate(DtoEntity, entityMetadata, EApiRouteType.GET_LIST, EApiDtoType.RESPONSE, "TestController");

		expect(createBodyDto).toBeDefined();
		expect(queryDto).toBeDefined();
		expect(responseDto).toBeDefined();
		expect(createBodyDtoCached).toBe(createBodyDto);
		expect(createBodyDto?.name).toBe("TestControllerCreateBodyDTO");
		expect(queryDto?.name).toBe("TestControllerGetListQueryDTO");
		expect(responseDto?.name).toBe("TestControllerGetListPageDTO");

		if (!createBodyDto || !queryDto || !responseDto) {
			throw new Error("Expected generated body, query, and response DTOs.");
		}

		const createBodyInstance = new createBodyDto() as Record<string, unknown>;
		const queryInstance = new queryDto() as Record<string, unknown>;
		const responseInstance = new responseDto() as Record<string, unknown>;
		const querySwaggerProperties: ReadonlyArray<string> | undefined = Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES_ARRAY, queryDto.prototype);
		const queryValidationProperties: ReadonlyArray<string> = getMetadataStorage()
			.getTargetValidationMetadatas(queryDto, "", true, false)
			.map((metadata): string => metadata.propertyName);
		expect(queryInstance).toBeDefined();
		expect(Object.getOwnPropertyDescriptor(queryInstance, "page")).toMatchObject({ enumerable: true, value: undefined, writable: true });
		expect(Object.keys(queryInstance ?? {}).slice(0, 4)).toEqual(["limit", "orderBy", "orderDirection", "page"]);
		expect(querySwaggerProperties?.slice(0, 4)).toEqual([":limit", ":orderBy", ":orderDirection", ":page"]);
		expect(queryValidationProperties.indexOf("object")).toBeLessThan(queryValidationProperties.indexOf("page"));
		expect(entityMetadata.columns.some((column) => column.name === "internalReference")).toBe(true);
		expect(createBodyInstance).not.toHaveProperty("internalReference");
		expect(responseInstance).not.toHaveProperty("internalReference");
		expect(Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES, createBodyDto.prototype, "internalReference")).toBeUndefined();
		expect(Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES, responseDto.prototype, "internalReference")).toBeUndefined();
		expect(queryInstance && "name[value]" in queryInstance).toBe(true);
		expect(queryInstance && "name[operator]" in queryInstance).toBe(true);
		expect(queryInstance && "internalReference[value]" in queryInstance).toBe(false);
		expect(queryInstance && "internalReference[operator]" in queryInstance).toBe(false);
		expect(queryInstance && "owner[value]" in queryInstance).toBe(false);
		expect(queryInstance && "owner[operator]" in queryInstance).toBe(false);
		expect(queryInstance && "owner.id[value]" in queryInstance).toBe(false);
		expect(queryInstance && "owner.id[values]" in queryInstance).toBe(false);
		expect(queryInstance && "owner.id[operator]" in queryInstance).toBe(false);
		expect(queryInstance && "owner.externalId[value]" in queryInstance).toBe(true);
		expect(queryInstance && "owner.externalId[values]" in queryInstance).toBe(true);
		expect(queryInstance && "owner.externalId[operator]" in queryInstance).toBe(true);
		expect(queryInstance && "owner.name[value]" in queryInstance).toBe(true);
		expect(queryInstance && "owner.name[values]" in queryInstance).toBe(true);
		expect(queryInstance && "owner.name[operator]" in queryInstance).toBe(true);
		expect(queryInstance && "owner.group[value]" in queryInstance).toBe(false);
		expect(queryInstance && "owner.group[operator]" in queryInstance).toBe(false);
		expect(queryInstance && "owner.hiddenName[value]" in queryInstance).toBe(false);
		expect(queryInstance && "owner.hiddenName[operator]" in queryInstance).toBe(false);
		expect(queryInstance && "owner.metadata[value]" in queryInstance).toBe(false);
		expect(queryInstance && "owner.metadata[operator]" in queryInstance).toBe(false);

		const ownerExternalIdOperatorMetadata = queryDto ? Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES, queryDto.prototype, "owner.externalId[operator]") : undefined;
		const ownerNameOperatorMetadata = queryDto ? Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES, queryDto.prototype, "owner.name[operator]") : undefined;

		expect(ownerExternalIdOperatorMetadata?.enum).toEqual(Object.values(EFilterOperationUuid));
		expect(ownerNameOperatorMetadata?.enum).toEqual(Object.values(EFilterOperationString));

		const invalidQuery = queryDto
			? plainToInstance(queryDto as ClassConstructor<unknown>, {
					"owner.externalId[operator]": EFilterOperation.CONT,
					"owner.externalId[value]": "owner-1",
				})
			: undefined;
		const invalidQueryErrors = invalidQuery ? validateSync(invalidQuery as object) : [];

		expect(invalidQueryErrors.some((error) => error.property === "owner.externalId[operator]")).toBe(true);
	});

	it("accepts uuid membership operators on the legacy generated query DTO and validates each member", () => {
		const entityMetadata = GenerateEntityInformation<DtoEntity>(DtoEntity as unknown as IApiBaseEntity);
		const queryDto = DtoGenerate(DtoEntity, entityMetadata, EApiRouteType.GET_LIST, EApiDtoType.QUERY, "TestController");
		const validIdentifiers = ["123e4567-e89b-12d3-a456-426614174000", "123e4567-e89b-12d3-a456-426614174001"];

		for (const operator of [EFilterOperation.IN, EFilterOperation.NOTIN]) {
			const validQuery = queryDto ? plainToInstance(queryDto as ClassConstructor<unknown>, { limit: 10, "owner.externalId[operator]": operator, "owner.externalId[values]": validIdentifiers, page: 1 }) : undefined;
			const invalidQuery = queryDto ? plainToInstance(queryDto as ClassConstructor<unknown>, { limit: 10, "owner.externalId[operator]": operator, "owner.externalId[values]": [validIdentifiers[0], "not-a-uuid"], page: 1 }) : undefined;

			expect(validQuery ? validateSync(validQuery as object) : []).toEqual([]);
			expect((invalidQuery ? validateSync(invalidQuery as object) : []).some((error) => error.property === "owner.externalId[values]")).toBe(true);
		}
	});

	it("preserves PAGE response constructor identity isolation across query plans", () => {
		const entityMetadata = GenerateEntityInformation<DtoEntity>(DtoEntity as unknown as IApiBaseEntity);
		const firstPlan: IApiControllerGetListQueryPlan = {
			controllerName: "FirstPageController",
			filter: { fields: {}, isLegacy: false },
			order: { fields: {}, isLegacy: false },
			schemaName: "FirstPageQueryDTO",
			signature: "first-page-plan",
		};
		const secondPlan: IApiControllerGetListQueryPlan = {
			...firstPlan,
			controllerName: "SecondPageController",
			schemaName: "SecondPageQueryDTO",
			signature: "second-page-plan",
		};
		const firstResponse = DtoGenerate(DtoEntity, entityMetadata, EApiRouteType.GET_LIST, EApiDtoType.RESPONSE, "FirstPage", undefined, undefined, firstPlan);
		const secondResponse = DtoGenerate(DtoEntity, entityMetadata, EApiRouteType.GET_LIST, EApiDtoType.RESPONSE, "SecondPage", undefined, undefined, secondPlan);

		expect(firstResponse).not.toBe(secondResponse);
	});

	it("uses semantic timestamp identifiers for generated write DTO ownership", async () => {
		const entityMetadata = GenerateEntityInformation<TimestampDtoEntity>(TimestampDtoEntity as unknown as IApiBaseEntity);
		const createBodyDto = DtoGenerate(TimestampDtoEntity, entityMetadata, EApiRouteType.CREATE, EApiDtoType.BODY, "TimestampDto");
		const updateBodyDto = DtoGenerate(TimestampDtoEntity, entityMetadata, EApiRouteType.UPDATE, EApiDtoType.BODY, "TimestampDto");
		const partialUpdateBodyDto = DtoGenerate(TimestampDtoEntity, entityMetadata, EApiRouteType.PARTIAL_UPDATE, EApiDtoType.BODY, "TimestampDto");
		const responseDto = DtoGenerate(TimestampDtoEntity, entityMetadata, EApiRouteType.CREATE, EApiDtoType.RESPONSE, "TimestampDto");

		expect(createBodyDto).toBeDefined();
		expect(updateBodyDto).toBeDefined();
		expect(partialUpdateBodyDto).toBeDefined();
		expect(responseDto).toBeDefined();

		if (!createBodyDto || !updateBodyDto || !partialUpdateBodyDto || !responseDto) {
			throw new Error("Expected timestamp DTOs to be generated.");
		}

		const writeBodyDtos = [createBodyDto, updateBodyDto, partialUpdateBodyDto];
		const infrastructurePropertyNames = ["insertedOn", "receivedOn", "modifiedOn"];

		for (const writeBodyDto of writeBodyDtos) {
			const instance = new writeBodyDto() as Record<string, unknown>;

			for (const propertyName of infrastructurePropertyNames) {
				expect(propertyName in instance).toBe(false);
				expect(Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES, writeBodyDto.prototype, propertyName)).toBeUndefined();
			}

			expect("createdAt" in instance).toBe(true);
			expect(Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES, writeBodyDto.prototype, "createdAt")).toBeDefined();
		}

		const validationPipe = new ValidationPipe({
			forbidNonWhitelisted: true,
			skipMissingProperties: true,
			transform: true,
			whitelist: true,
		});
		const createdAt = "2026-07-25T12:00:00.000Z";

		for (const writeBodyDto of writeBodyDtos) {
			const accepted = (await validationPipe.transform(
				{ createdAt },
				{
					metatype: writeBodyDto,
					type: "body",
				},
			)) as TimestampDtoEntity;

			expect(accepted.createdAt).toBeInstanceOf(Date);
			await expect(
				validationPipe.transform(
					{
						createdAt,
						insertedOn: "2026-07-25T09:00:00.000Z",
						modifiedOn: "2026-07-25T11:00:00.000Z",
						receivedOn: "2026-07-25T10:00:00.000Z",
					},
					{
						metatype: writeBodyDto,
						type: "body",
					},
				),
			).rejects.toMatchObject({
				response: {
					message: expect.arrayContaining(["property insertedOn should not exist", "property receivedOn should not exist", "property modifiedOn should not exist"]),
				},
			});
		}

		const responseInstance = plainToInstance(
			responseDto as ClassConstructor<TimestampDtoEntity>,
			{
				createdAt,
				id: "timestamp-1",
				insertedOn: "2026-07-25T09:00:00.000Z",
				modifiedOn: "2026-07-25T11:00:00.000Z",
				receivedOn: "2026-07-25T10:00:00.000Z",
			},
			{
				/* eslint-disable-next-line @elsikora/typescript/naming-convention */
				excludeExtraneousValues: true,
				strategy: "excludeAll",
			},
		);

		const plainResponse = instanceToPlain(responseInstance);

		for (const propertyName of infrastructurePropertyNames) {
			expect(plainResponse).toHaveProperty(propertyName);
		}
	});

	it("serializes nested manual DTOs in response mode without manual isResponse", () => {
		const entityMetadata = GenerateEntityInformation<ManualNestedPolicyEntity>(ManualNestedPolicyEntity as unknown as IApiBaseEntity);
		const responseDto = DtoGenerate(ManualNestedPolicyEntity, entityMetadata, EApiRouteType.GET, EApiDtoType.RESPONSE, "ManualNested");

		expect(responseDto).toBeDefined();

		const instance = plainToInstance(
			responseDto as ClassConstructor<ManualNestedPolicyEntity>,
			{
				document: {
					Statement: [
						{
							Condition: {
								StringEquals: {
									team: "platform",
								},
							},
							Effect: ManualPolicyEffect.ALLOW,
							Principal: {
								AWS: "arn:aws:iam::123456789012:root",
							},
						},
					],
					Version: "2012-10-17",
				},
				id: "policy-1",
			},
			{
				/* eslint-disable-next-line @elsikora/typescript/naming-convention */
				excludeExtraneousValues: true,
				strategy: "excludeAll",
			},
		);

		expect(instance).toMatchObject({
			document: {
				Statement: [
					{
						Condition: {
							StringEquals: {
								team: "platform",
							},
						},
						Effect: ManualPolicyEffect.ALLOW,
						Principal: {
							AWS: "arn:aws:iam::123456789012:root",
						},
					},
				],
				Version: "2012-10-17",
			},
			id: "policy-1",
		});
	});

	it("serializes standalone manual DTOs in response mode without manual isResponse", () => {
		const serializedDocument = plainToInstance(
			ManualPolicyDocumentDto,
			{
				Statement: [
					{
						Condition: {
							StringEquals: {
								team: "platform",
							},
						},
						Effect: ManualPolicyEffect.ALLOW,
						Principal: {
							AWS: "arn:aws:iam::123456789012:root",
						},
					},
				],
				Version: "2012-10-17",
			},
			{
				/* eslint-disable-next-line @elsikora/typescript/naming-convention */
				excludeExtraneousValues: true,
				strategy: "excludeAll",
			},
		);

		expect(instanceToPlain(serializedDocument)).toEqual({
			Statement: [
				{
					Condition: {
						StringEquals: {
							team: "platform",
						},
					},
					Effect: ManualPolicyEffect.ALLOW,
					Principal: {
						AWS: "arn:aws:iam::123456789012:root",
					},
				},
			],
			Version: "2012-10-17",
		});
	});

	it("generates context-specific nested manual DTO names per auto DTO path", () => {
		const entityMetadata = GenerateEntityInformation<ManualNestedPolicyEntity>(ManualNestedPolicyEntity as unknown as IApiBaseEntity);
		const bodyDto = DtoGenerate(ManualNestedPolicyEntity, entityMetadata, EApiRouteType.CREATE, EApiDtoType.BODY, "ManualNested");
		const responseDto = DtoGenerate(ManualNestedPolicyEntity, entityMetadata, EApiRouteType.GET, EApiDtoType.RESPONSE, "ManualNested");
		const bodyDocumentDto = Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES, bodyDto?.prototype, "document")?.type as ClassConstructor<ManualPolicyDocumentDto>;
		const responseDocumentDto = Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES, responseDto?.prototype, "document")?.type as ClassConstructor<ManualPolicyDocumentDto>;
		const bodyStatementDto = Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES, bodyDocumentDto?.prototype, "Statement")?.type as ClassConstructor<ManualPolicyStatementDto>;
		const responseStatementDto = Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES, responseDocumentDto?.prototype, "Statement")?.type as ClassConstructor<ManualPolicyStatementDto>;

		expect(bodyDocumentDto).toBeDefined();
		expect(responseDocumentDto).toBeDefined();
		expect(bodyStatementDto).toBeDefined();
		expect(responseStatementDto).toBeDefined();

		expect(bodyDocumentDto).not.toBe(ManualPolicyDocumentDto);
		expect(responseDocumentDto).not.toBe(ManualPolicyDocumentDto);
		expect(bodyStatementDto).not.toBe(ManualPolicyStatementDto);
		expect(responseStatementDto).not.toBe(ManualPolicyStatementDto);

		expect(bodyDocumentDto).not.toBe(responseDocumentDto);
		expect(bodyStatementDto).not.toBe(responseStatementDto);

		expect(bodyDocumentDto.name).toBe("ManualNestedCreateBodyDocumentDTO");
		expect(bodyStatementDto.name).toBe("ManualNestedCreateBodyDocumentStatementDTO");
		expect(responseDocumentDto.name).toBe("ManualNestedGetResponseDocumentDTO");
		expect(responseStatementDto.name).toBe("ManualNestedGetResponseDocumentStatementDTO");
	});

	it("keeps nested manual DTOs writable and validated in request mode", () => {
		const entityMetadata = GenerateEntityInformation<ManualNestedPolicyEntity>(ManualNestedPolicyEntity as unknown as IApiBaseEntity);
		const bodyDto = DtoGenerate(ManualNestedPolicyEntity, entityMetadata, EApiRouteType.CREATE, EApiDtoType.BODY, "ManualNested");

		expect(bodyDto).toBeDefined();

		const invalidInstance = plainToInstance(bodyDto as ClassConstructor<ManualNestedPolicyEntity>, {
			document: {
				Statement: [
					{
						Effect: ManualPolicyEffect.ALLOW,
						Principal: {
							AWS: 123,
						},
					},
				],
				Version: 123,
			},
		});
		const errors = validateSync(invalidInstance);
		const versionMetadata = Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES, ManualPolicyDocumentDto.prototype, "Version");

		expect(JSON.stringify(errors)).toContain("isString");
		expect(
			validateSync(
				plainToInstance(bodyDto as ClassConstructor<ManualNestedPolicyEntity>, {
					document: {
						Statement: [
							{
								Effect: ManualPolicyEffect.ALLOW,
								Principal: {
									AWS: "arn:aws:iam::123456789012:root",
								},
							},
						],
						Version: "2012-10-17",
					},
				}),
			),
		).toHaveLength(0);
		expect(versionMetadata?.readOnly).toBeUndefined();
	});
});
