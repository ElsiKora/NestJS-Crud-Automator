import { Column, Entity, ManyToOne, PrimaryColumn, TableInheritance } from "typeorm";

import { ApiPropertyDescribe, EApiPropertyDescribeType, EApiPropertyStringType } from "../../../src/index";

import { RequestRelationOwnerEntity } from "./owner.entity";

@Entity("sti_request_relation_details")
@TableInheritance({ column: { name: "kind", type: "varchar" } })
export class RequestRelationDetailEntity {
	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "kind",
		exampleValue: "CARD",
		format: EApiPropertyStringType.STRING,
		maxLength: 32,
		minLength: 1,
		pattern: "/^[A-Z_]+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public kind!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "label",
		exampleValue: "Detail",
		format: EApiPropertyStringType.STRING,
		maxLength: 64,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public label!: string;

	@ManyToOne(() => RequestRelationOwnerEntity, { nullable: true })
	@ApiPropertyDescribe({ description: "owner", type: EApiPropertyDescribeType.RELATION })
	public owner!: RequestRelationOwnerEntity;
}
