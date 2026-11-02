import "reflect-metadata";

import { ApiPropertyDescribe, EApiPropertyDescribeType, EApiPropertyStringType } from "../../../../src/index";
import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("e2e_relation_reference_tags")
export class E2eRelationReferenceTagEntity {
	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "id",
		type: EApiPropertyDescribeType.UUID,
	})
	public id!: string;

	@Column({ type: "varchar", unique: true })
	@ApiPropertyDescribe({
		description: "code",
		exampleValue: "tag-code",
		format: EApiPropertyStringType.STRING,
		maxLength: 32,
		minLength: 1,
		pattern: "/^[a-z-]+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public code!: string;
}
