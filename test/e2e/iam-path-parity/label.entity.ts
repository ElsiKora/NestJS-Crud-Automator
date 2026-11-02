import "reflect-metadata";

import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("e2e_iam_parity_labels")
export class E2eIamParityLabelEntity {
	@PrimaryColumn({ length: 36, type: "varchar" })
	public id!: string;

	@Column({ length: 32, type: "varchar" })
	public name!: string;
}
