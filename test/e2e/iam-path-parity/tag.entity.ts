import "reflect-metadata";

import type { E2eIamParityItemEntity } from "./item.entity";

import { Column, Entity, ManyToOne, PrimaryColumn } from "typeorm";

@Entity("e2e_iam_parity_tags")
export class E2eIamParityTagEntity {
	@PrimaryColumn({ length: 36, type: "varchar" })
	public id!: string;

	// No foreign key constraint, so the row routes delete items without touching their tags.
	@ManyToOne("E2eIamParityItemEntity", "tags", { createForeignKeyConstraints: false })
	public item!: E2eIamParityItemEntity;

	@Column({ length: 32, type: "varchar" })
	public name!: string;
}
