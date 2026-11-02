import "reflect-metadata";

import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

import { ApiPropertyDescribe, EApiPropertyDescribeType, EApiPropertyStringType } from "../../../../src/index";

@Entity("e2e_same_name_ambiguous_owners_first")
export class SameNameAmbiguousOwnerEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ description: "owner id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({ description: "owner label", exampleValue: "label", format: EApiPropertyStringType.STRING, maxLength: 32, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING })
	public label!: string;
}
