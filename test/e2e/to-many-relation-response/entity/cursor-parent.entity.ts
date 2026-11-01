import "reflect-metadata";

import { ApiPropertyDescribe, EApiPropertyDescribeType, EApiPropertyNumberType } from "../../../../src/index";
import { Column, Entity, OneToMany, PrimaryGeneratedColumn, type Relation } from "typeorm";

import { E2eToManyCursorChildEntity } from "./cursor-child.entity";

@Entity("e2e_to_many_cursor_parents")
export class E2eToManyCursorParentEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({
		description: "id",
		type: EApiPropertyDescribeType.UUID,
	})
	public id!: string;

	@Column({ type: "integer" })
	@ApiPropertyDescribe({
		description: "rank",
		exampleValue: 1,
		format: EApiPropertyNumberType.INTEGER,
		maximum: 1000,
		minimum: 0,
		multipleOf: 1,
		type: EApiPropertyDescribeType.NUMBER,
	})
	public rank!: number;

	@ApiPropertyDescribe({
		description: "children",
		type: EApiPropertyDescribeType.RELATION,
	})
	@OneToMany(() => E2eToManyCursorChildEntity, (child: E2eToManyCursorChildEntity): Relation<E2eToManyCursorParentEntity> => child.parent)
	public children?: Array<E2eToManyCursorChildEntity>;
}
