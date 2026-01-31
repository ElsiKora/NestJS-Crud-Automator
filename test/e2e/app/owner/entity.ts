import "reflect-metadata";

import { ApiPropertyDescribe, EApiPropertyDescribeType, EApiPropertyStringType } from "../../../../dist/esm/index";
import { Column, Entity, PrimaryColumn } from "typeorm";

import { E2E_OWNER_ID } from "../constants";
@Entity("e2e_owner_entities")
export class E2eOwnerEntity {
	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "ownerId",
		exampleValue: E2E_OWNER_ID,
		format: EApiPropertyStringType.STRING,
		maxLength: 64,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "ownerName",
		exampleValue: "Owner",
		format: EApiPropertyStringType.STRING,
		maxLength: 100,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public name!: string;
}
