import "reflect-metadata";

import { ApiPropertyDescribe, EApiPropertyDescribeType } from "../../../../src/index";
import { Entity, ManyToOne, PrimaryGeneratedColumn, type Relation } from "typeorm";

import { E2eToManyCursorParentEntity } from "./cursor-parent.entity";

@Entity("e2e_to_many_cursor_children")
export class E2eToManyCursorChildEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({
		description: "id",
		type: EApiPropertyDescribeType.UUID,
	})
	public id!: string;

	@ManyToOne(() => E2eToManyCursorParentEntity, (parent: E2eToManyCursorParentEntity): Array<E2eToManyCursorChildEntity> | undefined => parent.children, { nullable: false })
	public parent!: Relation<E2eToManyCursorParentEntity>;
}
