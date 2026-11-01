import { ChildEntity, Column, ManyToOne } from "typeorm";

import { ApiPropertyDescribe, EApiPropertyDescribeType, EApiPropertyStringType } from "../../../src/index";

import { IntegrationDetailIssuerEntity } from "./issuer.entity";
import { EIntegrationDetailKind } from "./kind.enum";
import { IntegrationDetailNetworkEntity } from "./network.entity";
import { IntegrationDetailEntity } from "./root.entity";

@ChildEntity(EIntegrationDetailKind.CARD)
export class IntegrationDetailCardEntity extends IntegrationDetailEntity {
	@ApiPropertyDescribe({
		description: "card number",
		exampleValue: "4111",
		format: EApiPropertyStringType.STRING,
		maxLength: 64,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	@Column({ nullable: true, type: "varchar" })
	public cardNumber!: string;

	@ApiPropertyDescribe({ description: "issuer", type: EApiPropertyDescribeType.RELATION })
	@ManyToOne(() => IntegrationDetailIssuerEntity, { nullable: true })
	public issuer!: IntegrationDetailIssuerEntity;

	@ApiPropertyDescribe({ description: "network", type: EApiPropertyDescribeType.RELATION })
	@ManyToOne(() => IntegrationDetailNetworkEntity, { eager: true, nullable: true })
	public network!: IntegrationDetailNetworkEntity;
}
