import "reflect-metadata";

import { ApiPropertyDescribe, EApiPropertyDescribeType } from "../../../../src/index";
import { Entity, JoinTable, ManyToMany, ManyToOne, PrimaryGeneratedColumn, type Relation } from "typeorm";

import { E2eToManyAuthorEntity } from "./author.entity";
import { E2eToManyTagEntity } from "./tag.entity";

/** Declares `items` only as a TypeORM relation, without Automator metadata. */
@Entity("e2e_to_many_items_relations")
export class E2eToManyItemsRelationEntity {
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

	@JoinTable({ name: "e2e_to_many_items_relation_tags" })
	@ManyToMany(() => E2eToManyTagEntity)
	public items?: Array<E2eToManyTagEntity>;
}
