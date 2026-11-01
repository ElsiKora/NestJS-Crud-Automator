import { ChildEntity, Column } from "typeorm";

import { ApiPropertyDescribe, EApiPropertyDescribeType, EApiPropertyStringType } from "../../../src/index";

import { EPaymentDetailKind } from "./kind.enum";
import { PaymentDetailEntity } from "./root.entity";

@ChildEntity(EPaymentDetailKind.QR)
export class PaymentDetailQrEntity extends PaymentDetailEntity {
	@Column({ nullable: true, type: "varchar" })
	@ApiPropertyDescribe({
		description: "qr payload",
		exampleValue: "qr",
		format: EApiPropertyStringType.STRING,
		maxLength: 64,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public qrPayload!: string;
}
