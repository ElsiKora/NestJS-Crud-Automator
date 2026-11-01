import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity({ name: "key_page_accounts" })
export class KeyPageAccountEntity {
	@PrimaryColumn({ type: "uuid" })
	public id!: string;

	@Column({ type: "varchar" })
	public name!: string;
}
