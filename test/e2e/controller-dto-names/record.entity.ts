import "reflect-metadata";

import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";

import { ApiPropertyDescribe, ApiPropertyString, EApiPropertyDescribeType, EApiPropertyNumberType, EApiPropertyStringType } from "../../../src/index";

@Entity("e2e_dto_name_owners")
export class E2eDtoNameOwnerEntity {
	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "id",
		exampleValue: "owner-1",
		format: EApiPropertyStringType.STRING,
		maxLength: 64,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public id!: string;
}

export class E2eDtoNameRecordDocumentDto {
	@ApiPropertyString({
		description: "version",
		entity: E2eDtoNameRecordDocumentDto,
		exampleValue: "1",
		format: EApiPropertyStringType.STRING,
		maxLength: 16,
		minLength: 1,
		pattern: "/^.+$/",
	})
	public version!: string;
}

@Entity("e2e_dto_name_records")
export class E2eDtoNameRecordEntity {
	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "id",
		exampleValue: "record-1",
		format: EApiPropertyStringType.STRING,
		maxLength: 64,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "title",
		exampleValue: "Record",
		format: EApiPropertyStringType.STRING,
		maxLength: 64,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public title!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "ownerId",
		exampleValue: "owner-1",
		format: EApiPropertyStringType.STRING,
		maxLength: 64,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public ownerId!: string;

	@ManyToOne(() => E2eDtoNameOwnerEntity)
	@JoinColumn({ name: "ownerId" })
	@ApiPropertyDescribe({
		description: "owner",
		type: EApiPropertyDescribeType.RELATION,
	})
	public owner!: E2eDtoNameOwnerEntity;

	@Column({ nullable: true, type: "simple-json" })
	@ApiPropertyDescribe({
		dataType: E2eDtoNameRecordDocumentDto,
		description: "document",
		isNullable: true,
		shouldValidateNested: true,
		type: EApiPropertyDescribeType.OBJECT,
	})
	public document?: E2eDtoNameRecordDocumentDto;

	@Column({ nullable: true, type: "simple-json" })
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
		description: "details",
		discriminator: {
			mapping: {
				Variant: "Variant",
			},
			propertyName: "kind",
			shouldKeepDiscriminatorProperty: true,
		},
		isDynamicallyGenerated: true,
		isNullable: true,
		type: EApiPropertyDescribeType.OBJECT,
	} as never)
	public details?: Record<string, unknown>;
}
