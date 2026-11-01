import { CreateDateColumn, Entity, PrimaryColumn } from "typeorm";

@Entity({ name: "key_page_created" })
export class KeyPageCreatedEntity {
	@CreateDateColumn()
	public createdAt!: Date;

	@PrimaryColumn({ type: "uuid" })
	public id!: string;
}
