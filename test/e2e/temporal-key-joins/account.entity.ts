import "reflect-metadata";

import { ApiPropertyDescribe, EApiPropertyDescribeType } from "../../../src/index";
import { Entity, PrimaryColumn } from "typeorm";

@Entity({ name: "e2e_temporal_accounts" })
export class E2eTemporalAccountEntity {
	@PrimaryColumn({ type: "uuid" })
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;
}
