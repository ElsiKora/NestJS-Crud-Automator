import type { Relation } from "typeorm";

import { Entity, JoinTable, ManyToMany, PrimaryColumn } from "typeorm";

import { KeyPageBatchEntity } from "./key-page-batch.entity";

@Entity({ name: "key_page_auditors" })
export class KeyPageAuditorEntity {
	@JoinTable({ inverseJoinColumns: [{ name: "batchClosedAt", referencedColumnName: "closedAt" }], name: "key_page_auditor_batches" })
	@ManyToMany(() => KeyPageBatchEntity, (batch: KeyPageBatchEntity) => batch.auditors)
	public batches!: Relation<Array<KeyPageBatchEntity>>;

	@PrimaryColumn({ type: "uuid" })
	public id!: string;
}
