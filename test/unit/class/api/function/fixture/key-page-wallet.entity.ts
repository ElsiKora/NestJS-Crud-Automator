import type { Relation } from "typeorm";

import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";

import { KeyPageAccountEntity } from "./key-page-account.entity";

@Entity({ name: "key_page_wallets" })
export class KeyPageWalletEntity {
	@JoinColumn({ name: "accountId" })
	@ManyToOne(() => KeyPageAccountEntity, { eager: true })
	public account!: Relation<KeyPageAccountEntity>;

	@PrimaryColumn({ type: "uuid" })
	public id!: string;
}
