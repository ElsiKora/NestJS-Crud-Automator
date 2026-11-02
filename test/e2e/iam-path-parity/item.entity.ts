import "reflect-metadata";

import { Column, Entity, JoinTable, ManyToMany, ManyToOne, OneToMany, PrimaryColumn } from "typeorm";

import { ApiPropertyDescribe, EApiPropertyDescribeType, EApiPropertyStringType } from "../../../src/index";

import { E2eIamParityLabelEntity } from "./label.entity";
import { E2eIamParityItemMeta } from "./meta.embedded";
import { E2eIamParityOwnerEntity } from "./owner.entity";
import { E2eIamParityTagEntity } from "./tag.entity";

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

	@JoinTable({ name: "e2e_iam_parity_item_labels" })
	@ManyToMany(() => E2eIamParityLabelEntity)
	public labels?: Array<E2eIamParityLabelEntity>;

	@Column(() => E2eIamParityItemMeta)
	public meta!: E2eIamParityItemMeta;

	// No foreign key constraint, so an item can name an owner that does not exist.
	@ManyToOne(() => E2eIamParityOwnerEntity, { createForeignKeyConstraints: false, nullable: true })
	public owner?: E2eIamParityOwnerEntity | null;

	@OneToMany(() => E2eIamParityTagEntity, (tag: E2eIamParityTagEntity) => tag.item)
	public tags?: Array<E2eIamParityTagEntity>;
}
