import "reflect-metadata";

import type { Relation } from "typeorm";

import { ApiPropertyDescribe, EApiPropertyDateIdentifier, EApiPropertyDateType, EApiPropertyDescribeType, EApiPropertyNumberType } from "../../../src/index";
import { Column, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, PrimaryColumn } from "typeorm";

import { E2eTemporalAccountEntity } from "./account.entity";

@Entity({ name: "e2e_temporal_ledgers" })
export class E2eTemporalLedgerEntity {
	@ManyToOne(() => E2eTemporalAccountEntity)
	@JoinColumn({ name: "accountId" })
	@ApiPropertyDescribe({
		description: "account",
		relationMetadata: { entity: E2eTemporalAccountEntity, isEager: false, relationType: "many-to-one" },
		type: EApiPropertyDescribeType.RELATION,
	} as unknown as { description: string; type: EApiPropertyDescribeType.RELATION })
	public account!: Relation<E2eTemporalAccountEntity>;

	@Column({ type: "uuid" })
	@ApiPropertyDescribe({ description: "accountId", type: EApiPropertyDescribeType.UUID })
	public accountId!: string;

	@Column({ precision: 3, type: "timestamptz" })
	@ApiPropertyDescribe({ format: EApiPropertyDateType.DATE_TIME, identifier: EApiPropertyDateIdentifier.DATE, type: EApiPropertyDescribeType.DATE })
	public bookedAt!: Date;

	@PrimaryColumn({ type: "uuid" })
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@Column({ type: "int" })
	@ApiPropertyDescribe({ description: "sequence", exampleValue: 1, format: EApiPropertyNumberType.INTEGER, maximum: 1000, minimum: 0, multipleOf: 1, type: EApiPropertyDescribeType.NUMBER })
	public sequence!: number;

	@PrimaryColumn({ precision: 3, type: "timestamptz" })
	@ApiPropertyDescribe({ format: EApiPropertyDateType.DATE_TIME, identifier: EApiPropertyDateIdentifier.CREATED_AT, type: EApiPropertyDescribeType.DATE })
	public postedAt!: Date;

	@JoinTable({
		inverseJoinColumns: [{ name: "accountId", referencedColumnName: "id" }],
		joinColumns: [
			{ name: "ledgerId", referencedColumnName: "id" },
			{ name: "ledgerPostedAt", referencedColumnName: "postedAt" },
		],
		name: "e2e_temporal_ledger_watchers",
	})
	@ManyToMany(() => E2eTemporalAccountEntity)
	public watchers!: Relation<Array<E2eTemporalAccountEntity>>;
}
