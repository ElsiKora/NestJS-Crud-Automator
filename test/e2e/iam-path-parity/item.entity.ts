import "reflect-metadata";

import { Column, Entity, ManyToOne, PrimaryColumn } from "typeorm";

import { ApiPropertyDescribe, EApiPropertyDescribeType, EApiPropertyStringType } from "../../../src/index";

import { E2eIamParityItemMeta } from "./meta.embedded";
import { E2eIamParityOwnerEntity } from "./owner.entity";

@Entity("e2e_iam_parity_items")
export class E2eIamParityItemEntity {
	@PrimaryColumn({ length: 36, type: "varchar" })
	@ApiPropertyDescribe({ description: "id", exampleValue: "a", format: EApiPropertyStringType.STRING, maxLength: 36, minLength: 1, pattern: "/^[a-z0-9-]+$/", type: EApiPropertyDescribeType.STRING })
	public id!: string;

	@Column({ type: "boolean" })
	@ApiPropertyDescribe({ description: "isFeatured", type: EApiPropertyDescribeType.BOOLEAN })
	public isFeatured!: boolean;

	@Column({ length: 64, type: "varchar" })
	@ApiPropertyDescribe({ description: "label", exampleValue: "Alpha", format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 1, pattern: "/^[A-Za-z]+$/", type: EApiPropertyDescribeType.STRING })
	public label!: string;

	@Column(() => E2eIamParityItemMeta)
	public meta!: E2eIamParityItemMeta;

	@ManyToOne(() => E2eIamParityOwnerEntity, { nullable: true })
	public owner?: E2eIamParityOwnerEntity | null;
}
