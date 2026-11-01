import type { Relation } from "typeorm";

import { Column, Entity, ManyToMany, OneToMany, PrimaryColumn } from "typeorm";

import { KeyPageAuditorEntity } from "./key-page-auditor.entity";
import { KeyPageEntryEntity } from "./key-page-entry.entity";

@Entity({ name: "key_page_batches" })
export class KeyPageBatchEntity {
	@ManyToMany(() => KeyPageAuditorEntity, (auditor: KeyPageAuditorEntity) => auditor.batches)
	public auditors!: Relation<Array<KeyPageAuditorEntity>>;

	@Column({ precision: 3, type: "timestamptz", unique: true })
	public closedAt!: Date;

	@OneToMany(() => KeyPageEntryEntity, (entry: KeyPageEntryEntity) => entry.batch)
	public entries!: Relation<Array<KeyPageEntryEntity>>;

	@PrimaryColumn({ type: "uuid" })
	public id!: string;
}
