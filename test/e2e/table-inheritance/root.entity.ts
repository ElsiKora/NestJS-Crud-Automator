import { Check, Column, Entity, PrimaryColumn, TableInheritance } from "typeorm";

import { ApiPropertyDescribe, EApiPropertyDescribeType, EApiPropertyNumberType, EApiPropertyStringType } from "../../../src/index";

import { EPaymentDetailKind } from "./kind.enum";

@Check("payment_detail_card_number_check", `"kind" <> 'CARD_TRANSFER' OR "cardNumber" IS NOT NULL`)
@Entity("payment_details")
@TableInheritance({ column: { enum: EPaymentDetailKind, enumName: "payment_detail_kind", name: "kind", type: "enum" } })
export class PaymentDetailEntity {
	@PrimaryColumn({ type: "uuid" })
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@Column({ enum: EPaymentDetailKind, enumName: "payment_detail_kind", type: "enum" })
	@ApiPropertyDescribe({ description: "kind", enum: EPaymentDetailKind, enumName: "EPaymentDetailKind", type: EApiPropertyDescribeType.ENUM })
	public kind!: EPaymentDetailKind;

	@Column({ type: "uuid" })
	@ApiPropertyDescribe({ description: "owner id", type: EApiPropertyDescribeType.UUID })
	public ownerId!: string;

	@Column({ type: "int" })
	@ApiPropertyDescribe({
		description: "rank",
		exampleValue: 1,
		format: EApiPropertyNumberType.INTEGER,
		maximum: 1000,
		minimum: 0,
		multipleOf: 1,
		type: EApiPropertyDescribeType.NUMBER,
	})
	public rank!: number;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "label",
		exampleValue: "Detail",
		format: EApiPropertyStringType.STRING,
		maxLength: 64,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public label!: string;
}
