import type { Relation } from "typeorm";

import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";

import { KeyPageReceiptEntity } from "./key-page-receipt.entity";

@Entity({ name: "key_page_holders" })
export class KeyPageHolderEntity {
	@PrimaryColumn({ type: "uuid" })
	public id!: string;

	@JoinColumn({ name: "receiptId" })
	@ManyToOne(() => KeyPageReceiptEntity)
	public receipt!: Relation<KeyPageReceiptEntity>;
}
