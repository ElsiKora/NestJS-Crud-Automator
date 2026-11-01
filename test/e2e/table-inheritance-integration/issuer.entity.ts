import { Column, Entity, PrimaryColumn } from "typeorm";

import { ApiPropertyDescribe, EApiPropertyDescribeType, EApiPropertyStringType } from "../../../src/index";

@Entity("sti_integration_issuers")
export class IntegrationDetailIssuerEntity {
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	@PrimaryColumn({ type: "uuid" })
	public id!: string;

	@ApiPropertyDescribe({
		description: "name",
		exampleValue: "Issuer",
		format: EApiPropertyStringType.STRING,
		maxLength: 64,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	@Column({ type: "varchar" })
	public name!: string;
}
