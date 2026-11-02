import "reflect-metadata";

import { Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

import { ApiPropertyDescribe, EApiPropertyDescribeType } from "../../../../src/index";

@Entity("e2e_same_name_import_order_holders")
export class SameNameImportOrderHolderEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ description: "holder id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@ManyToOne("SameNameImportOrderOwnerEntity")
	@ApiPropertyDescribe({ description: "owner", type: EApiPropertyDescribeType.RELATION })
	public owner!: { id: string; pluginOnly: string };
}
