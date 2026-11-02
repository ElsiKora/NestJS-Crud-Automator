import "reflect-metadata";

import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("e2e_iam_parity_companies")
export class E2eIamParityCompanyEntity {
	@PrimaryColumn({ length: 36, type: "varchar" })
	public id!: string;

	@Column({ type: "boolean" })
	public isVerified!: boolean;

	@Column({ length: 32, nullable: true, type: "varchar" })
	public name?: null | string;
}
