import "reflect-metadata";

import { ApiPropertyDescribe, EApiPropertyDescribeType } from "../../../src/index";
import { Entity, PrimaryColumn } from "typeorm";

@Entity({ name: "sti_temporal_accounts" })
export class StiTemporalAccountEntity {
	@PrimaryColumn({ type: "uuid" })
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;
}
