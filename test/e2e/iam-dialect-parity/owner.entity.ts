import "reflect-metadata";

import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("e2e_iam_dialect_owners")
export class E2eIamDialectOwnerEntity {
	@PrimaryColumn({ length: 36, type: "varchar" })
	public id!: string;

	@Column({ length: 64, nullable: true, type: "varchar" })
	public name?: null | string;
}
