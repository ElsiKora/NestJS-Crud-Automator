import { ChildEntity, Column } from "typeorm";

import { ApiPropertyDescribe, EApiPropertyDescribeType, EApiPropertyStringType } from "../../../src/index";

import { EPaymentDetailKind } from "./kind.enum";
import { PaymentDetailTransferEntity } from "./transfer.entity";

@ChildEntity(EPaymentDetailKind.BANK_TRANSFER)
export class PaymentDetailBankTransferEntity extends PaymentDetailTransferEntity {
	@Column({ nullable: true, type: "varchar" })
	@ApiPropertyDescribe({
		description: "account number",
		exampleValue: "40817",
		format: EApiPropertyStringType.STRING,
		maxLength: 64,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public accountNumber!: string;
}
