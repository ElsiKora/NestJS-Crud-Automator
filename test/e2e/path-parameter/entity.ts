import "reflect-metadata";

import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

import { ApiPropertyDescribe, ApiPropertyUUID, EApiPropertyDateIdentifier, EApiPropertyDateType, EApiPropertyDescribeType, EApiPropertyNumberType, EApiPropertyStringType } from "../../../src/index";

export const E2E_PATH_PARAMETER_INT_MAXIMUM: number = 2_147_483_647;

@Entity("e2e_path_parameter_int_items")
export class E2ePathParameterIntItemEntity {
	@PrimaryGeneratedColumn({ type: "int" })
	@ApiPropertyDescribe({
		description: "id",
		exampleValue: 1,
		format: EApiPropertyNumberType.INTEGER,
		maximum: E2E_PATH_PARAMETER_INT_MAXIMUM,
		minimum: 1,
		multipleOf: 1,
		type: EApiPropertyDescribeType.NUMBER,
	})
	public id!: number;

	@Column({ type: "int" })
	@ApiPropertyDescribe({
		description: "groupNumber",
		exampleValue: 1,
		format: EApiPropertyNumberType.INTEGER,
		maximum: E2E_PATH_PARAMETER_INT_MAXIMUM,
		minimum: 1,
		multipleOf: 1,
		type: EApiPropertyDescribeType.NUMBER,
	})
	public groupNumber!: number;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "label",
		exampleValue: "Label",
		format: EApiPropertyStringType.STRING,
		maxLength: 64,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public label!: string;
}

@Entity("e2e_path_parameter_uuid_items")
export class E2ePathParameterUuidItemEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({
		description: "id",
		type: EApiPropertyDescribeType.UUID,
	})
	public id!: string;

	@Column({ type: "uuid" })
	@ApiPropertyDescribe({
		description: "ownerId",
		type: EApiPropertyDescribeType.UUID,
	})
	public ownerId!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "label",
		exampleValue: "Label",
		format: EApiPropertyStringType.STRING,
		maxLength: 64,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public label!: string;
}

@Entity("e2e_path_parameter_day_items")
export class E2ePathParameterDayItemEntity {
	@PrimaryGeneratedColumn({ type: "int" })
	@ApiPropertyDescribe({
		description: "id",
		exampleValue: 1,
		format: EApiPropertyNumberType.INTEGER,
		maximum: E2E_PATH_PARAMETER_INT_MAXIMUM,
		minimum: 1,
		multipleOf: 1,
		type: EApiPropertyDescribeType.NUMBER,
	})
	public id!: number;

	@Column({ type: "date" })
	@ApiPropertyDescribe({
		format: EApiPropertyDateType.DATE,
		identifier: EApiPropertyDateIdentifier.DATE,
		type: EApiPropertyDescribeType.DATE,
	})
	public day!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "label",
		exampleValue: "Label",
		format: EApiPropertyStringType.STRING,
		maxLength: 64,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public label!: string;
}

export class E2ePathParameterManualUuidParametersDto {
	@ApiPropertyUUID({ description: "id", entity: E2ePathParameterUuidItemEntity, isRequired: true })
	public id!: string;
}
