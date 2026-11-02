import "reflect-metadata";

import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

import { ApiPropertyDescribe, EApiPropertyDescribeType, EApiPropertyStringType } from "../../../../src/index";

// Both modules declare an entity class with this name on purpose.
@Entity("e2e_same_name_first_items")
export class SameNameItemEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ description: "first id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({ description: "first alpha", exampleValue: "alpha", format: EApiPropertyStringType.STRING, maxLength: 6, minLength: 1, pattern: "/^[a-z]+$/", type: EApiPropertyDescribeType.STRING })
	public alpha!: string;
}
