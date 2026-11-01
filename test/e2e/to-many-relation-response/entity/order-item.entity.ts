import "reflect-metadata";

import { ApiPropertyDescribe, EApiPropertyDescribeType } from "../../../../src/index";
import { Column, Entity, ManyToOne, PrimaryColumn, type Relation } from "typeorm";

import { E2eToManyOrderEntity } from "./order.entity";

@Entity("e2e_to_many_order_items")
export class E2eToManyOrderItemEntity {
	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "id",
		type: EApiPropertyDescribeType.UUID,
	})
	public id!: string;

	@Column({ nullable: true, type: "varchar" })
	public code?: null | string;

	@ManyToOne(() => E2eToManyOrderEntity, (order: E2eToManyOrderEntity): Array<E2eToManyOrderItemEntity> | undefined => order.items, { nullable: true })
	public order?: null | Relation<E2eToManyOrderEntity>;
}
