import "reflect-metadata";

import { Column, Entity, ManyToOne, PrimaryColumn } from "typeorm";

import { E2eIamParityCompanyEntity } from "./company.entity";

@Entity("e2e_iam_parity_owners")
export class E2eIamParityOwnerEntity {
	@ManyToOne(() => E2eIamParityCompanyEntity, { nullable: true })
	public company?: E2eIamParityCompanyEntity | null;

	@PrimaryColumn({ length: 36, type: "varchar" })
	public id!: string;

	@Column({ type: "boolean" })
	public isActive!: boolean;

	@Column({ length: 32, nullable: true, type: "varchar" })
	public tag?: null | string;
}
