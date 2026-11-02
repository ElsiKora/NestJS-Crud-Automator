import "reflect-metadata";

import { Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

import { ApiPropertyDescribe, EApiPropertyDescribeType } from "../../../../src/index";

@Entity("e2e_same_name_late_holders")
export class SameNameLateHolderEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ description: "holder id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@ManyToOne("SameNameLateOwnerEntity")
	@ApiPropertyDescribe({ description: "owner", type: EApiPropertyDescribeType.RELATION })
	public owner!: { id: string; label: string };
}
