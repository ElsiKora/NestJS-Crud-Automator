import "reflect-metadata";

import type { Relation } from "typeorm";

import { ApiPropertyDescribe, EApiPropertyDescribeType, EApiPropertyStringType } from "../../../src/index";
import { ChildEntity, Column, JoinColumn, ManyToOne } from "typeorm";

import { StiTemporalAccountEntity } from "./account.entity";
import { ETemporalEntryKind } from "./kind.enum";
import { StiTemporalEntryEntity } from "./root.entity";

@ChildEntity(ETemporalEntryKind.DEBIT)
export class StiTemporalDebitEntryEntity extends StiTemporalEntryEntity {
	@ManyToOne(() => StiTemporalAccountEntity, { nullable: true })
	@JoinColumn({ name: "counterpartyId" })
	@ApiPropertyDescribe({ description: "counterparty", type: EApiPropertyDescribeType.RELATION })
	public counterparty!: Relation<StiTemporalAccountEntity>;

	@Column({ nullable: true, type: "varchar" })
	@ApiPropertyDescribe({ description: "debit reference", exampleValue: "D-1", format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING })
	public debitReference!: string;
}
