import "reflect-metadata";

import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

import { ApiPropertyDescribe, EApiDtoType, EApiPropertyDateIdentifier, EApiPropertyDateType, EApiPropertyDescribeType, EApiPropertyNumberType, EApiPropertyStringType, EApiRouteType } from "../../../src/index";

export enum EE2eLegacyQueryStatus {
	ACTIVE = "active",
	ARCHIVED = "archived",
}

@Entity("e2e_legacy_query_items")
export class E2eLegacyQueryItemEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "label",
		exampleValue: "Label",
		format: EApiPropertyStringType.STRING,
		maxLength: 64,
		minLength: 1,
		pattern: "/^[A-Za-z0-9 ]+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public label!: string;

	@Column({ type: "int" })
	@ApiPropertyDescribe({
		description: "rank",
		exampleValue: 1,
		format: EApiPropertyNumberType.INTEGER,
		maximum: 1000,
		minimum: 0,
		multipleOf: 1,
		type: EApiPropertyDescribeType.NUMBER,
	})
	public rank!: number;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "status",
		enum: EE2eLegacyQueryStatus,
		enumName: "EE2eLegacyQueryStatus",
		type: EApiPropertyDescribeType.ENUM,
	})
	public status!: EE2eLegacyQueryStatus;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "visible to clients, hidden from the order enum",
		exampleValue: "Secret",
		format: EApiPropertyStringType.STRING,
		maxLength: 64,
		minLength: 1,
		pattern: "/^[A-Za-z0-9 ]+$/",
		properties: { [EApiRouteType.GET_LIST]: { [EApiDtoType.QUERY]: { useAsOrderByFilter: false } } },
		type: EApiPropertyDescribeType.STRING,
	})
	public unsortable!: string;

	@Column({ type: "varchar" })
	public undescribed!: string;

	@Column({ type: "int" })
	@ApiPropertyDescribe({
		description: "listed in responses, disabled as a list query field",
		exampleValue: 1,
		format: EApiPropertyNumberType.INTEGER,
		maximum: 1000,
		minimum: 0,
		multipleOf: 1,
		properties: { [EApiRouteType.GET_LIST]: { [EApiDtoType.QUERY]: { isEnabled: false } } },
		type: EApiPropertyDescribeType.NUMBER,
	})
	public queryDisabled!: number;

	@Column({ type: "int" })
	@ApiPropertyDescribe({
		description: "hidden from list responses",
		exampleValue: 1,
		format: EApiPropertyNumberType.INTEGER,
		maximum: 1000,
		minimum: 0,
		multipleOf: 1,
		properties: { [EApiRouteType.GET_LIST]: { [EApiDtoType.RESPONSE]: { isEnabled: false } } },
		type: EApiPropertyDescribeType.NUMBER,
	})
	public responseHidden!: number;

	@Column({ nullable: true, type: "varchar" })
	@ApiPropertyDescribe({
		description: "note",
		exampleValue: "Note",
		format: EApiPropertyStringType.STRING,
		isNullable: true,
		maxLength: 64,
		minLength: 1,
		pattern: "/^[A-Za-z0-9 ]+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public note?: null | string;

	@Column({ type: "boolean" })
	@ApiPropertyDescribe({ description: "isFeatured", type: EApiPropertyDescribeType.BOOLEAN })
	public isFeatured!: boolean;

	@Column({ type: "date" })
	@ApiPropertyDescribe({ format: EApiPropertyDateType.DATE, identifier: EApiPropertyDateIdentifier.DATE, type: EApiPropertyDescribeType.DATE })
	public releasedOn!: string;

	@Column()
	@ApiPropertyDescribe({ format: EApiPropertyDateType.DATE_TIME, identifier: EApiPropertyDateIdentifier.CREATED_AT, type: EApiPropertyDescribeType.DATE })
	public createdAt!: Date;

	@Column({ type: "int" })
	@ApiPropertyDescribe({
		description: "not exposed in list responses",
		exampleValue: 1,
		format: EApiPropertyNumberType.INTEGER,
		maximum: 1000,
		minimum: 0,
		multipleOf: 1,
		properties: { [EApiRouteType.GET_LIST]: { [EApiDtoType.RESPONSE]: { isExpose: false, isResponse: true } } },
		type: EApiPropertyDescribeType.NUMBER,
	})
	public exposeHidden!: number;
}
