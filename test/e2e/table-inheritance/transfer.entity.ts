import { ChildEntity, Column } from "typeorm";

import { ApiPropertyDescribe, EApiPropertyDescribeType, EApiPropertyStringType } from "../../../src/index";

import { PaymentDetailEntity } from "./root.entity";

@ChildEntity()
export abstract class PaymentDetailTransferEntity extends PaymentDetailEntity {
	@Column({ nullable: true, type: "varchar" })
	@ApiPropertyDescribe({
		description: "bank name",
		exampleValue: "Bank",
		format: EApiPropertyStringType.STRING,
		maxLength: 64,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public bankName!: string;
}
