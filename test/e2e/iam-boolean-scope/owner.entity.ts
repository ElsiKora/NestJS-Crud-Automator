import "reflect-metadata";

import { Column, Entity, ManyToOne, PrimaryColumn } from "typeorm";

import { ApiPropertyDescribe, EApiPropertyDescribeType } from "../../../src/index";

import { E2eIamBooleanCompanyEntity } from "./company.entity";

@Entity("e2e_iam_boolean_owners")
export class E2eIamBooleanOwnerEntity {
	@ManyToOne(() => E2eIamBooleanCompanyEntity, { nullable: true })
	public company?: E2eIamBooleanCompanyEntity | null;

	@PrimaryColumn({ length: 36, type: "varchar" })
	public id!: string;

	@Column({ type: "boolean" })
	@ApiPropertyDescribe({ description: "isActive", type: EApiPropertyDescribeType.BOOLEAN })
	public isActive!: boolean;
}
