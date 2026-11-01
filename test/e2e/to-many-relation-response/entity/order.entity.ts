import "reflect-metadata";

import { ApiPropertyDescribe, EApiPropertyDescribeType, EApiPropertyStringType } from "../../../../src/index";
import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, type Relation } from "typeorm";

import { E2eToManyAuthorEntity } from "./author.entity";
import { E2eToManyOrderItemEntity } from "./order-item.entity";

@Entity("e2e_to_many_orders")
export class E2eToManyOrderEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({
		description: "id",
		type: EApiPropertyDescribeType.UUID,
	})
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "title",
		exampleValue: "Title",
		format: EApiPropertyStringType.STRING,
		maxLength: 64,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public title!: string;

	@ApiPropertyDescribe({
		description: "owner",
		type: EApiPropertyDescribeType.RELATION,
	})
	@ManyToOne(() => E2eToManyAuthorEntity, { nullable: true })
	public owner?: null | Relation<E2eToManyAuthorEntity>;

	@ApiPropertyDescribe({
		description: "items",
		type: EApiPropertyDescribeType.RELATION,
	})
	@OneToMany(() => E2eToManyOrderItemEntity, (item: E2eToManyOrderItemEntity): null | Relation<E2eToManyOrderEntity> | undefined => item.order)
	public items?: Array<E2eToManyOrderItemEntity>;
}
