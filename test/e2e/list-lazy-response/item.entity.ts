import "reflect-metadata";

import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

import { ApiPropertyDescribe, EApiDtoType, EApiPropertyDescribeType, EApiPropertyNumberType, EApiPropertyStringType, EApiRouteType } from "../../../src/index";

@Entity("e2e_list_lazy_response_items")
export class E2eListLazyResponseItemEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({ description: "label", exampleValue: "Label", format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 1, pattern: "/^[A-Za-z0-9 ]+$/", type: EApiPropertyDescribeType.STRING })
	public label!: string;

	@Column({ type: "int" })
	// No lazy list response publishes rank, and a column the list response hides cannot be a list query field.
	@ApiPropertyDescribe({ description: "rank", exampleValue: 1, format: EApiPropertyNumberType.INTEGER, maximum: 1000, minimum: 0, multipleOf: 1, properties: { [EApiRouteType.GET_LIST]: { [EApiDtoType.QUERY]: { isEnabled: false } } }, type: EApiPropertyDescribeType.NUMBER })
	public rank!: number;
}
