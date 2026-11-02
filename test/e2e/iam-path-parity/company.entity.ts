import "reflect-metadata";

import { Column, DeleteDateColumn, Entity, PrimaryColumn } from "typeorm";

@Entity("e2e_iam_parity_companies")
export class E2eIamParityCompanyEntity {
	// A soft-deleted company is not loaded with its owner and is not joined by a scope, so a path through it is missing.
	@DeleteDateColumn({ nullable: true })
	public deletedAt?: Date | null;

	@PrimaryColumn({ length: 36, type: "varchar" })
	public id!: string;

	@Column({ type: "boolean" })
	public isVerified!: boolean;

	@Column({ length: 32, nullable: true, type: "varchar" })
	public name?: null | string;
}
