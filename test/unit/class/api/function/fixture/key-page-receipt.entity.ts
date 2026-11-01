import type { Relation } from "typeorm";

import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";

import { KeyPageBatchEntity } from "./key-page-batch.entity";
import { KeyPageJournalEntity } from "./key-page-journal.entity";

@Entity({ name: "key_page_receipts" })
export class KeyPageReceiptEntity {
	@JoinColumn({ name: "batchId" })
	@ManyToOne(() => KeyPageBatchEntity)
	public batch!: Relation<KeyPageBatchEntity>;

	@PrimaryColumn({ type: "uuid" })
	public id!: string;

	@JoinColumn([
		{ name: "journalId", referencedColumnName: "id" },
		{ name: "journalBookedAt", referencedColumnName: "bookedAt" },
	])
	@ManyToOne(() => KeyPageJournalEntity, { eager: true })
	public journal!: Relation<KeyPageJournalEntity>;
}
