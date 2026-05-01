import "reflect-metadata";

import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { ClassConstructor } from "class-transformer";

import { ApiPropertyEnum } from "@decorator/api/property/enum.decorator";
import { ApiPropertyObject } from "@decorator/api/property/object.decorator";
import { ApiPropertyString } from "@decorator/api/property/string.decorator";
import { ApiPropertyDescribe } from "@decorator/api/property/describe.decorator";
import { EApiDtoType, EApiPropertyDateIdentifier, EApiPropertyDateType, EApiPropertyDescribeType, EApiPropertyNumberType, EApiPropertyStringType, EApiRouteType } from "@enum/decorator/api";
import { DECORATORS } from "@nestjs/swagger/dist/constants";
import { DtoGenerate } from "@utility/dto/generate/core.utility";
import { GenerateEntityInformation } from "@utility/generate-entity-information.utility";
import { instanceToPlain, plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { describe, expect, it } from "vitest";

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
		expect(queryInstance).toBeDefined();
		expect(queryInstance && "name[value]" in queryInstance).toBe(true);
		expect(queryInstance && "name[operator]" in queryInstance).toBe(true);
	});

	it("serializes nested manual DTOs in response mode without manual isResponse", () => {
		const entityMetadata = GenerateEntityInformation<ManualNestedPolicyEntity>(ManualNestedPolicyEntity as unknown as IApiBaseEntity);
		const responseDto = DtoGenerate(ManualNestedPolicyEntity, entityMetadata, EApiRouteType.GET, EApiDtoType.RESPONSE);

		expect(responseDto).toBeDefined();

		const instance = plainToInstance(responseDto as ClassConstructor<ManualNestedPolicyEntity>, {
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
		}, {
			/* eslint-disable-next-line @elsikora/typescript/naming-convention */
			excludeExtraneousValues: true,
			strategy: "excludeAll",
		});

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
		const serializedDocument = plainToInstance(ManualPolicyDocumentDto, {
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
		}, {
			/* eslint-disable-next-line @elsikora/typescript/naming-convention */
			excludeExtraneousValues: true,
			strategy: "excludeAll",
		});

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
		expect(validateSync(plainToInstance(bodyDto as ClassConstructor<ManualNestedPolicyEntity>, {
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
		}))).toHaveLength(0);
		expect(versionMetadata?.readOnly).toBeUndefined();
	});
});
