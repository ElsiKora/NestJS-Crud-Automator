import "reflect-metadata";

import { ApiPropertyDescribe, EApiPropertyDateIdentifier, EApiPropertyDateType, EApiPropertyDescribeType } from "../../../src/index";
import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity({ name: "e2e_temporal_accounts" })
export class E2eTemporalAccountEntity {
	@PrimaryColumn({ type: "uuid" })
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@Column({ nullable: true, precision: 3, type: "timestamptz" })
	@ApiPropertyDescribe({ format: EApiPropertyDateType.DATE_TIME, identifier: EApiPropertyDateIdentifier.DATE, isNullable: true, type: EApiPropertyDescribeType.DATE })
	public openedAt!: Date | null;
}
