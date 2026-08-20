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
import { DECORATORS } from "@nestjs/swagger/dist/constants";
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
		type: EApiPropertyDescribeType.UUID,
	})
	public id!: string;

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
		maxLength: 50,
		minLength: 1,
		pattern: "/^.+$/",
		properties: {
			[EApiRouteType.GET_LIST]: {
				[EApiDtoType.QUERY]: {
					isEnabled: false,
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
	it("generates cached DTOs for request, query, and response types", () => {
		const entityMetadata = GenerateEntityInformation<DtoEntity>(DtoEntity as unknown as IApiBaseEntity);

		const createBodyDto = DtoGenerate(DtoEntity, entityMetadata, EApiRouteType.CREATE, EApiDtoType.BODY);
		const createBodyDtoCached = DtoGenerate(DtoEntity, entityMetadata, EApiRouteType.CREATE, EApiDtoType.BODY);
		const queryDto = DtoGenerate(DtoEntity, entityMetadata, EApiRouteType.GET_LIST, EApiDtoType.QUERY);
		const responseDto = DtoGenerate(DtoEntity, entityMetadata, EApiRouteType.GET_LIST, EApiDtoType.RESPONSE);

		expect(createBodyDto).toBeDefined();
		expect(queryDto).toBeDefined();
		expect(responseDto).toBeDefined();
		expect(createBodyDtoCached).toBe(createBodyDto);
		expect(createBodyDto?.name).toBe("DtoEntityCreateBodyDTO");
		expect(queryDto?.name).toBe("DtoEntityGetListQueryDTO");
		expect(responseDto?.name).toBe("DtoEntityGetListResponseItemsDTO");

		const queryInstance = queryDto ? (new queryDto() as Record<string, unknown>) : undefined;
		const querySwaggerProperties: ReadonlyArray<string> | undefined = queryDto ? Reflect.getMetadata(DECORATORS.API_MODEL_PROPERTIES_ARRAY, queryDto.prototype) : undefined;
		const queryValidationProperties: ReadonlyArray<string> = queryDto
			? getMetadataStorage()
					.getTargetValidationMetadatas(queryDto, "", true, false)
					.map((metadata): string => metadata.propertyName)
			: [];
		expect(queryInstance).toBeDefined();
		expect(Object.getOwnPropertyDescriptor(queryInstance, "page")).toMatchObject({ enumerable: true, value: undefined, writable: true });
		expect(Object.keys(queryInstance ?? {}).slice(0, 4)).toEqual(["limit", "orderBy", "orderDirection", "page"]);
		expect(querySwaggerProperties?.slice(0, 4)).toEqual([":limit", ":orderBy", ":orderDirection", ":page"]);
		expect(queryValidationProperties.indexOf("object")).toBeLessThan(queryValidationProperties.indexOf("page"));
		expect(queryInstance && "name[value]" in queryInstance).toBe(true);
		expect(queryInstance && "name[operator]" in queryInstance).toBe(true);
		expect(queryInstance && "owner[value]" in queryInstance).toBe(false);
		expect(queryInstance && "owner[operator]" in queryInstance).toBe(false);
		expect(queryInstance && "owner.id[value]" in queryInstance).toBe(true);
		expect(queryInstance && "owner.id[values]" in queryInstance).toBe(true);
		expect(queryInstance && "owner.id[operator]" in queryInstance).toBe(true);
		expect(queryInstance && "owner.name[value]" in queryInstance).toBe(true);
		expect(queryInstance && "owner.name[values]" in queryInstance).toBe(true);
		expect(queryInstance && "owner.name[operator]" in queryInstance).toBe(true);
		expect(queryInstance && "owner.group[value]" in queryInstance).toBe(false);
		expect(queryInstance && "owner.group[operator]" in queryInstance).toBe(false);
		expect(queryInstance && "owner.hiddenName[value]" in queryInstance).toBe(false);
		expect(queryInstance && "owner.hiddenName[operator]" in queryInstance).toBe(false);
		expect(queryInstance && "owner.metadata[value]" in queryInstance).toBe(false);
		expect(queryInstance && "owner.metadata[operator]" in queryInstance).toBe(false);

		const ownerIdOperatorMetadata = queryDto ? Reflect.getMetadata(DECORATORS.API_MODEL_PROPERTIES, queryDto.prototype, "owner.id[operator]") : undefined;
		const ownerNameOperatorMetadata = queryDto ? Reflect.getMetadata(DECORATORS.API_MODEL_PROPERTIES, queryDto.prototype, "owner.name[operator]") : undefined;

		expect(ownerIdOperatorMetadata?.enum).toEqual(Object.values(EFilterOperationUuid));
		expect(ownerNameOperatorMetadata?.enum).toEqual(Object.values(EFilterOperationString));

		const invalidQuery = queryDto
			? plainToInstance(queryDto as ClassConstructor<unknown>, {
					"owner.id[operator]": EFilterOperation.CONT,
					"owner.id[value]": "owner-1",
				})
			: undefined;
		const invalidQueryErrors = invalidQuery ? validateSync(invalidQuery as object) : [];

		expect(invalidQueryErrors.some((error) => error.property === "owner.id[operator]")).toBe(true);
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
		const firstResponse = DtoGenerate(DtoEntity, entityMetadata, EApiRouteType.GET_LIST, EApiDtoType.RESPONSE, undefined, undefined, firstPlan);
		const secondResponse = DtoGenerate(DtoEntity, entityMetadata, EApiRouteType.GET_LIST, EApiDtoType.RESPONSE, undefined, undefined, secondPlan);

		expect(firstResponse).not.toBe(secondResponse);
	});

	it("uses semantic timestamp identifiers for generated write DTO ownership", async () => {
		const entityMetadata = GenerateEntityInformation<TimestampDtoEntity>(TimestampDtoEntity as unknown as IApiBaseEntity);
		const createBodyDto = DtoGenerate(TimestampDtoEntity, entityMetadata, EApiRouteType.CREATE, EApiDtoType.BODY);
		const updateBodyDto = DtoGenerate(TimestampDtoEntity, entityMetadata, EApiRouteType.UPDATE, EApiDtoType.BODY);
		const partialUpdateBodyDto = DtoGenerate(TimestampDtoEntity, entityMetadata, EApiRouteType.PARTIAL_UPDATE, EApiDtoType.BODY);
		const responseDto = DtoGenerate(TimestampDtoEntity, entityMetadata, EApiRouteType.CREATE, EApiDtoType.RESPONSE);

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
				expect(Reflect.getMetadata(DECORATORS.API_MODEL_PROPERTIES, writeBodyDto.prototype, propertyName)).toBeUndefined();
			}

			expect("createdAt" in instance).toBe(true);
			expect(Reflect.getMetadata(DECORATORS.API_MODEL_PROPERTIES, writeBodyDto.prototype, "createdAt")).toBeDefined();
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
		const responseDto = DtoGenerate(ManualNestedPolicyEntity, entityMetadata, EApiRouteType.GET, EApiDtoType.RESPONSE);

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
		const bodyDto = DtoGenerate(ManualNestedPolicyEntity, entityMetadata, EApiRouteType.CREATE, EApiDtoType.BODY);
		const responseDto = DtoGenerate(ManualNestedPolicyEntity, entityMetadata, EApiRouteType.GET, EApiDtoType.RESPONSE);
		const bodyDocumentDto = Reflect.getMetadata(DECORATORS.API_MODEL_PROPERTIES, bodyDto?.prototype, "document")?.type as ClassConstructor<ManualPolicyDocumentDto>;
		const responseDocumentDto = Reflect.getMetadata(DECORATORS.API_MODEL_PROPERTIES, responseDto?.prototype, "document")?.type as ClassConstructor<ManualPolicyDocumentDto>;
		const bodyStatementDto = Reflect.getMetadata(DECORATORS.API_MODEL_PROPERTIES, bodyDocumentDto?.prototype, "Statement")?.type as ClassConstructor<ManualPolicyStatementDto>;
		const responseStatementDto = Reflect.getMetadata(DECORATORS.API_MODEL_PROPERTIES, responseDocumentDto?.prototype, "Statement")?.type as ClassConstructor<ManualPolicyStatementDto>;

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

		expect(bodyDocumentDto.name).toBe("ManualNestedPolicyEntityCreateBodyDocumentDTO");
		expect(bodyStatementDto.name).toBe("ManualNestedPolicyEntityCreateBodyDocumentStatementDTO");
		expect(responseDocumentDto.name).toBe("ManualNestedPolicyEntityGetResponseDocumentDTO");
		expect(responseStatementDto.name).toBe("ManualNestedPolicyEntityGetResponseDocumentStatementDTO");
	});

	it("keeps nested manual DTOs writable and validated in request mode", () => {
		const entityMetadata = GenerateEntityInformation<ManualNestedPolicyEntity>(ManualNestedPolicyEntity as unknown as IApiBaseEntity);
		const bodyDto = DtoGenerate(ManualNestedPolicyEntity, entityMetadata, EApiRouteType.CREATE, EApiDtoType.BODY);

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
		const versionMetadata = Reflect.getMetadata(DECORATORS.API_MODEL_PROPERTIES, ManualPolicyDocumentDto.prototype, "Version");

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
