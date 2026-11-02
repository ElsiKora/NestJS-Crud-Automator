import "reflect-metadata";

import { Column, Entity, PrimaryGeneratedColumn, TableInheritance } from "typeorm";

import { ApiPropertyDescribe, EApiPropertyDescribeType, EApiPropertyNumberType, EApiPropertyStringType } from "../../../src/index";

@Entity("e2e_inherited_order_sti")
@TableInheritance({ column: { name: "kind", type: "varchar" } })
export class E2eInheritedOrderStiRootEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({ description: "name", exampleValue: "Name", format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 1, pattern: "/^[A-Za-z0-9 ]+$/", type: EApiPropertyDescribeType.STRING })
	public name!: string;

	@Column({ type: "int" })
	@ApiPropertyDescribe({ description: "rank", exampleValue: 1, format: EApiPropertyNumberType.INTEGER, maximum: 1000, minimum: 0, multipleOf: 1, type: EApiPropertyDescribeType.NUMBER })
	public rank!: number;
}
