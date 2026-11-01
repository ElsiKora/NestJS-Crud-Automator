import { ChildEntity, Column, ManyToOne } from "typeorm";

import { ApiPropertyDescribe, EApiPropertyDescribeType, EApiPropertyStringType } from "../../../src/index";

import { PaymentDetailIssuerEntity } from "./issuer.entity";
import { EPaymentDetailKind } from "./kind.enum";
import { PaymentDetailTransferEntity } from "./transfer.entity";

@ChildEntity(EPaymentDetailKind.CARD_TRANSFER)
export class PaymentDetailCardTransferEntity extends PaymentDetailTransferEntity {
	@Column({ nullable: true, type: "varchar" })
	@ApiPropertyDescribe({
		description: "card number",
		exampleValue: "4111",
		format: EApiPropertyStringType.STRING,
		maxLength: 64,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public cardNumber!: string;

	@ApiPropertyDescribe({ description: "issuer", type: EApiPropertyDescribeType.RELATION })
	@ManyToOne(() => PaymentDetailIssuerEntity, { nullable: true })
	public issuer!: PaymentDetailIssuerEntity;
}
