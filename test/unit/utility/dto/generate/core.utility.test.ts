import "reflect-metadata";

import type { IApiBaseEntity } from "@interface/api-base-entity.interface";

import { ApiPropertyDescribe } from "@decorator/api/property/describe.decorator";
import { EApiDtoType, EApiPropertyDateIdentifier, EApiPropertyDateType, EApiPropertyDescribeType, EApiPropertyNumberType, EApiPropertyStringType, EApiRouteType } from "@enum/decorator/api";
import { DtoGenerate } from "@utility/dto/generate/core.utility";
import { GenerateEntityInformation } from "@utility/generate-entity-information.utility";
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { describe, expect, it } from "vitest";

enum TestStatus {
	ACTIVE = "ACTIVE",
	INACTIVE = "INACTIVE",
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
});
