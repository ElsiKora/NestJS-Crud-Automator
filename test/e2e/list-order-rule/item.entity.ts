import "reflect-metadata";

import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

import { ApiPropertyDescribe, EApiDtoType, EApiPropertyDescribeType, EApiPropertyNumberType, EApiPropertyStringType, EApiRouteType } from "../../../src/index";

const INTEGER = { exampleValue: 1, format: EApiPropertyNumberType.INTEGER, maximum: 1000, minimum: 0, multipleOf: 1, type: EApiPropertyDescribeType.NUMBER } as const;

@Entity("e2e_list_order_rule_items")
export class E2eListOrderRuleItemEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({ description: "label", exampleValue: "Label", format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 1, pattern: "/^[A-Za-z0-9 ]+$/", type: EApiPropertyDescribeType.STRING })
	public label!: string;

	@Column({ type: "int" })
	@ApiPropertyDescribe({ description: "rank", ...INTEGER })
	public rank!: number;

	@Column({ type: "int" })
	@ApiPropertyDescribe({ description: "secret", ...INTEGER, properties: { [EApiRouteType.GET_LIST]: { [EApiDtoType.RESPONSE]: { isExpose: false, isResponse: true } } } })
	public secret!: number;
}
