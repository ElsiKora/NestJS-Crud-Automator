import type { Relation } from "typeorm";

import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";

import { ApiPropertyDescribe, EApiPropertyDescribeType, EApiPropertyStringType } from "../../../src/index";

import { IntegrationDetailFormEntity } from "./form.entity";

@Entity("sti_integration_notes")
export class IntegrationDetailNoteEntity {
	@JoinColumn({ name: "detailId" })
	@ManyToOne(() => IntegrationDetailFormEntity, ({ notes }: IntegrationDetailFormEntity) => notes)
	public detail!: Relation<IntegrationDetailFormEntity>;

	@ApiPropertyDescribe({ description: "detail id", type: EApiPropertyDescribeType.UUID })
	@Column({ type: "uuid" })
	public detailId!: string;

	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	@PrimaryColumn({ type: "uuid" })
	public id!: string;

	@ApiPropertyDescribe({
		description: "name",
		exampleValue: "note",
		format: EApiPropertyStringType.STRING,
		maxLength: 64,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	@Column({ type: "varchar" })
	public name!: string;
}
