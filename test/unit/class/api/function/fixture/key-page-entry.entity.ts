import type { Relation } from "typeorm";

import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";

import { KeyPageBatchEntity } from "./key-page-batch.entity";

@Entity({ name: "key_page_entries" })
export class KeyPageEntryEntity {
	@JoinColumn({ name: "batchClosedAt", referencedColumnName: "closedAt" })
	@ManyToOne(() => KeyPageBatchEntity, (batch: KeyPageBatchEntity) => batch.entries)
	public batch!: Relation<KeyPageBatchEntity>;

	@PrimaryColumn({ type: "uuid" })
	public id!: string;
}
