import "reflect-metadata";

import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

import { ApiPropertyDescribe, EApiPropertyDescribeType, EApiPropertyNumberType } from "../../../../src/index";

// Both modules declare an entity class with this name on purpose.
@Entity("e2e_same_name_second_items")
export class SameNameItemEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ description: "second id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@Column({ type: "integer" })
	@ApiPropertyDescribe({ description: "second beta", exampleValue: 3, format: EApiPropertyNumberType.INTEGER, maximum: 9, minimum: 1, multipleOf: 1, type: EApiPropertyDescribeType.NUMBER })
	public beta!: number;
}
