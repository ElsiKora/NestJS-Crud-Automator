import "reflect-metadata";

import { Column, Entity, ManyToOne, PrimaryColumn } from "typeorm";

import { ApiPropertyDescribe, EApiPropertyDescribeType, EApiPropertyStringType } from "../../../src/index";

import { E2eIamBooleanItemMeta } from "./meta.embedded";
import { E2eIamBooleanOwnerEntity } from "./owner.entity";

@Entity("e2e_iam_boolean_items")
export class E2eIamBooleanItemEntity {
	@PrimaryColumn({ length: 36, type: "varchar" })
	@ApiPropertyDescribe({ description: "id", exampleValue: "item-1", format: EApiPropertyStringType.STRING, maxLength: 36, minLength: 1, pattern: "/^[a-z0-9-]+$/", type: EApiPropertyDescribeType.STRING })
	public id!: string;

	@Column({ type: "boolean" })
	@ApiPropertyDescribe({ description: "isFeatured", type: EApiPropertyDescribeType.BOOLEAN })
	public isFeatured!: boolean;

	// An internal flag IAM may use without publishing it: no describe metadata, nullable.
	@Column({ nullable: true, type: "boolean" })
	public isInternal?: boolean | null;

	@Column({ length: 64, type: "varchar" })
	@ApiPropertyDescribe({ description: "label", exampleValue: "Alpha", format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 1, pattern: "/^[A-Za-z]+$/", type: EApiPropertyDescribeType.STRING })
	public label!: string;

	@Column(() => E2eIamBooleanItemMeta)
	public meta!: E2eIamBooleanItemMeta;

	@ManyToOne(() => E2eIamBooleanOwnerEntity, { nullable: true })
	public owner?: E2eIamBooleanOwnerEntity | null;
}
