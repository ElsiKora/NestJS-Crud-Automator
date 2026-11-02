import "reflect-metadata";

import { Column, CreateDateColumn, PrimaryGeneratedColumn } from "typeorm";

import { ApiPropertyDescribe, EApiPropertyDateIdentifier, EApiPropertyDateType, EApiPropertyDescribeType, EApiPropertyNumberType } from "../../../src/index";

export abstract class E2eInheritedOrderBaseEntity {
	@CreateDateColumn()
	@ApiPropertyDescribe({ format: EApiPropertyDateType.DATE_TIME, identifier: EApiPropertyDateIdentifier.CREATED_AT, type: EApiPropertyDescribeType.DATE })
	public createdAt!: Date;

	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@Column({ type: "int" })
	@ApiPropertyDescribe({ description: "rank", exampleValue: 1, format: EApiPropertyNumberType.INTEGER, maximum: 1000, minimum: 0, multipleOf: 1, type: EApiPropertyDescribeType.NUMBER })
	public rank!: number;
}
