import type { Relation } from "typeorm";

import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";

import { ApiPropertyDescribe, EApiPropertyDescribeType, EApiPropertyStringType } from "../../../src/index";

import { IntegrationDetailEntity } from "./root.entity";

@Entity("sti_integration_tags")
export class IntegrationDetailTagEntity {
	@JoinColumn({ name: "detailId" })
	@ManyToOne(() => IntegrationDetailEntity, ({ tags }: IntegrationDetailEntity) => tags)
	public detail!: Relation<IntegrationDetailEntity>;

	@ApiPropertyDescribe({ description: "detail id", type: EApiPropertyDescribeType.UUID })
	@Column({ type: "uuid" })
	public detailId!: string;

	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	@PrimaryColumn({ type: "uuid" })
	public id!: string;

	@ApiPropertyDescribe({
		description: "name",
		exampleValue: "tag",
		format: EApiPropertyStringType.STRING,
		maxLength: 64,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	@Column({ type: "varchar" })
	public name!: string;
}
