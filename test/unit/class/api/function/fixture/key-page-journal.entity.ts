import type { Relation } from "typeorm";

import { Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToOne, PrimaryColumn, RelationId } from "typeorm";

import { KeyPageAccountEntity } from "./key-page-account.entity";

@Entity({ name: "key_page_journals" })
export class KeyPageJournalEntity {
	@JoinColumn({ name: "accountId" })
	@ManyToOne(() => KeyPageAccountEntity)
	public account!: Relation<KeyPageAccountEntity>;

	@RelationId((journal: KeyPageJournalEntity) => journal.account)
	public accountRelationId!: string;

	@JoinColumn({ name: "authorId" })
	@OneToOne(() => KeyPageAccountEntity)
	public author!: Relation<KeyPageAccountEntity>;

	@RelationId((journal: KeyPageJournalEntity) => journal.author)
	public authorRelationId!: string;

	@PrimaryColumn({ precision: 3, type: "timestamptz" })
	public bookedAt!: Date;

	@PrimaryColumn({ type: "uuid" })
	public id!: string;

	@RelationId((journal: KeyPageJournalEntity) => journal.readers)
	public readerIds!: Array<string>;

	@JoinTable({ name: "key_page_journal_readers" })
	@ManyToMany(() => KeyPageAccountEntity)
	public readers!: Relation<Array<KeyPageAccountEntity>>;
}
