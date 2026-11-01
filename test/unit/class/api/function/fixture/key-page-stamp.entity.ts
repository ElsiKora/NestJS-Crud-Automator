import { Column, Entity, PrimaryColumn } from "typeorm";

// Stores a Date as ISO text, which SQLite compares as written; the SQLite driver itself would bind a Date in another text form.
const toIsoText = (value: unknown): unknown => (value instanceof Date ? value.toISOString() : value);
// Stores a Date as UTC wall-clock text, the form a MySQL timestamp literal takes.
const toUtcText = (value: unknown): unknown => (value instanceof Date ? value.toISOString().replace("T", " ").replace("Z", "") : value);

@Entity({ name: "key_page_sqlite_stamps" })
export class KeyPageSqliteStampEntity {
	@PrimaryColumn({ type: "varchar" })
	public id!: string;

	@Column({ transformer: { from: (value: unknown): unknown => value, to: toIsoText }, type: "datetime" })
	public stampedAt!: Date;
}

@Entity({ name: "key_page_mysql_stamps" })
export class KeyPageMysqlStampEntity {
	@PrimaryColumn({ type: "varchar" })
	public id!: string;

	@Column({ precision: 3, transformer: { from: (value: unknown): unknown => value, to: toUtcText }, type: "timestamp" })
	public stampedAt!: Date;
}
