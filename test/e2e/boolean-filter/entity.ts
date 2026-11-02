import "reflect-metadata";

import { Column, Entity, PrimaryColumn } from "typeorm";

import { ApiPropertyDescribe, EApiPropertyDescribeType, EApiPropertyStringType } from "../../../src/index";

@Entity("e2e_boolean_filter_items")
export class E2eBooleanFilterItemEntity {
	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@Column({ type: "boolean" })
	@ApiPropertyDescribe({ description: "isFeatured", type: EApiPropertyDescribeType.BOOLEAN })
	public isFeatured!: boolean;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "label",
		exampleValue: "Alpha",
		format: EApiPropertyStringType.STRING,
		maxLength: 64,
		minLength: 1,
		pattern: "/^[A-Za-z]+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public label!: string;
}
