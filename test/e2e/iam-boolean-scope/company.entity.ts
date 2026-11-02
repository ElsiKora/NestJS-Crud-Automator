import "reflect-metadata";

import { Column, Entity, PrimaryColumn } from "typeorm";

import { ApiPropertyDescribe, EApiPropertyDescribeType } from "../../../src/index";

@Entity("e2e_iam_boolean_companies")
export class E2eIamBooleanCompanyEntity {
	@PrimaryColumn({ length: 36, type: "varchar" })
	public id!: string;

	@Column({ type: "boolean" })
	@ApiPropertyDescribe({ description: "isVerified", type: EApiPropertyDescribeType.BOOLEAN })
	public isVerified!: boolean;
}
