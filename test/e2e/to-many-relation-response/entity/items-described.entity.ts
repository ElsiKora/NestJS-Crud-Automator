import "reflect-metadata";

import { ApiPropertyDescribe, EApiPropertyDescribeType, EApiPropertyStringType } from "../../../../src/index";
import { Entity, ManyToOne, PrimaryGeneratedColumn, type Relation } from "typeorm";

import { E2eToManyAuthorEntity } from "./author.entity";

/** Declares `items` only through Automator metadata, without a TypeORM column or relation. */
@Entity("e2e_to_many_items_described")
export class E2eToManyItemsDescribedEntity {
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

	@ApiPropertyDescribe({
		description: "items",
		exampleValue: ["item"],
		format: EApiPropertyStringType.STRING,
		isArray: true,
		isUniqueItems: false,
		maxItems: 10,
		maxLength: 64,
		minItems: 0,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public items?: Array<string>;
}
