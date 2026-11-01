import type { Relation } from "typeorm";

import { Column, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, PrimaryColumn } from "typeorm";

import { KeyPageAccountEntity } from "./key-page-account.entity";

@Entity({ name: "key_page_ledgers" })
export class KeyPageLedgerEntity {
	@JoinColumn({ name: "accountId" })
	@ManyToOne(() => KeyPageAccountEntity)
	public account!: Relation<KeyPageAccountEntity>;

	@Column({ type: "uuid" })
	public accountId!: string;

	@PrimaryColumn({ type: "uuid" })
	public id!: string;

	@PrimaryColumn({ precision: 3, type: "timestamptz" })
	public postedAt!: Date;

	@Column({ type: "int" })
	public sequence!: number;

	@JoinTable({ name: "key_page_ledger_watchers" })
	@ManyToMany(() => KeyPageAccountEntity)
	public watchers!: Relation<Array<KeyPageAccountEntity>>;
}
