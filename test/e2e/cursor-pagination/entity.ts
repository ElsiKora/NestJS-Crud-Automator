import "reflect-metadata";

import { ApiPropertyDescribe, EApiPropertyDescribeType, EApiPropertyNumberType, EApiPropertyStringType, GetDefaultStringFormatProperties } from "../../../src/index";
import { Column, Entity, Generated, PrimaryColumn } from "typeorm";

import { ECursorPaginationState } from "./state.enum";

@Entity("cursor_pagination_items")
export class CursorPaginationEntity {
	@Column({ type: "boolean" })
	@ApiPropertyDescribe({
		description: "active",
		type: EApiPropertyDescribeType.BOOLEAN,
	})
	public active!: boolean;

	@Column({ type: "bigint" })
	@ApiPropertyDescribe({
		...GetDefaultStringFormatProperties(EApiPropertyStringType.BIGINT_STRING),
		description: "generation",
		type: EApiPropertyDescribeType.STRING,
	})
	public generation!: string;

	@Column({ type: "bigint" })
	@Generated("increment")
	@ApiPropertyDescribe({
		...GetDefaultStringFormatProperties(EApiPropertyStringType.BIGINT_STRING),
		description: "generated bigint",
		type: EApiPropertyDescribeType.STRING,
	})
	public generatedBigint!: string;

	@Column({ type: "integer" })
	@Generated("increment")
	@ApiPropertyDescribe({
		description: "generated integer",
		exampleValue: 1,
		format: EApiPropertyNumberType.INTEGER,
		maximum: 100,
		minimum: 0,
		multipleOf: 1,
		type: EApiPropertyDescribeType.NUMBER,
	})
	public generatedInteger!: number;

	@PrimaryColumn({ type: "uuid" })
	@ApiPropertyDescribe({
		description: "id",
		type: EApiPropertyDescribeType.UUID,
	})
	public id!: string;

	@Column({ type: "int" })
	@ApiPropertyDescribe({
		description: "group",
		exampleValue: 1,
		format: EApiPropertyNumberType.INTEGER,
		maximum: 100,
		minimum: 0,
		multipleOf: 1,
		type: EApiPropertyDescribeType.NUMBER,
	})
	public group!: number;

	@Column({ type: "int" })
	@ApiPropertyDescribe({
		description: "rank",
		exampleValue: 1,
		format: EApiPropertyNumberType.INTEGER,
		maximum: 100,
		minimum: 0,
		multipleOf: 1,
		type: EApiPropertyDescribeType.NUMBER,
	})
	public rank!: number;

	@Column({ type: "smallint" })
	@ApiPropertyDescribe({
		description: "small rank",
		exampleValue: 1,
		format: EApiPropertyNumberType.INTEGER,
		maximum: 100,
		minimum: 0,
		multipleOf: 1,
		type: EApiPropertyDescribeType.NUMBER,
	})
	public smallRank!: number;

	@Column({ type: "smallint" })
	@ApiPropertyDescribe({
		description: "state",
		enum: ECursorPaginationState,
		enumName: "ECursorPaginationState",
		type: EApiPropertyDescribeType.ENUM,
	})
	public state!: ECursorPaginationState;
}
