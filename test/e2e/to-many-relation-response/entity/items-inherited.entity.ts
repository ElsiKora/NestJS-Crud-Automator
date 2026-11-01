import "reflect-metadata";

import { ApiPropertyDescribe, EApiPropertyDescribeType } from "../../../../src/index";
import { Entity, ManyToOne, PrimaryGeneratedColumn, type Relation } from "typeorm";

import { E2eToManyAuthorEntity } from "./author.entity";
import { E2eToManyItemsBaseEntity } from "./items-base.entity";

/** Inherits `items` from its parent class. */
@Entity("e2e_to_many_items_inherited")
export class E2eToManyItemsInheritedEntity extends E2eToManyItemsBaseEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({
		description: "id",
		type: EApiPropertyDescribeType.UUID,
	})
	public id!: string;

	@ApiPropertyDescribe({
		description: "owner",
		type: EApiPropertyDescribeType.RELATION,
	})
	@ManyToOne(() => E2eToManyAuthorEntity, { nullable: true })
	public owner?: null | Relation<E2eToManyAuthorEntity>;
}
