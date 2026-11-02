import "reflect-metadata";

import { Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

import { ApiPropertyDescribe, EApiPropertyDescribeType } from "../../../../src/index";

import type { SameNameAmbiguousOwnerEntity } from "./owner";

@Entity("e2e_same_name_ambiguous_holders")
export class SameNameAmbiguousHolderEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ description: "holder id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@ManyToOne("SameNameAmbiguousOwnerEntity")
	@ApiPropertyDescribe({ description: "owner", type: EApiPropertyDescribeType.RELATION })
	public owner!: SameNameAmbiguousOwnerEntity;
}
