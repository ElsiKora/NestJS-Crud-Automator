import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity({ name: "key_page_mssql" })
export class KeyPageMssqlEntity {
	@Column({ transformer: { from: (value: unknown): unknown => value, to: (value: unknown): unknown => value }, type: "datetime2" })
	public bookedAt!: Date;

	@PrimaryColumn({ type: "varchar" })
	public id!: string;
}
