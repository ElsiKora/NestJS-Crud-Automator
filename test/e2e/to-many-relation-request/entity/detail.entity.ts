import "reflect-metadata";

import { ApiPropertyDescribe, EApiPropertyDescribeType, EApiPropertyStringType } from "../../../../src/index";
import { Column, Entity, PrimaryGeneratedColumn, TableInheritance } from "typeorm";

/** Table inheritance root whose only to-many relations live on its CARD and BANK children. */
@Entity("e2e_hydration_details")
@TableInheritance({ column: { name: "kind", type: "varchar" } })
export class E2eHydrationDetailEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({
		description: "id",
		type: EApiPropertyDescribeType.UUID,
	})
	public id!: string;

	@Column({ type: "varchar" })
	public kind!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "label",
		exampleValue: "Label",
		format: EApiPropertyStringType.STRING,
		maxLength: 64,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public label!: string;
}
