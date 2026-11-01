import type { Relation } from "typeorm";

import { ChildEntity, Column, OneToMany } from "typeorm";

import { ApiPropertyDescribe, EApiPropertyDescribeType, EApiPropertyStringType } from "../../../src/index";

import { PaymentDetailFormFieldItemDto } from "./form-field-item.dto";
import { PaymentDetailFormFieldEntity } from "./form-field.entity";
import { EPaymentDetailKind } from "./kind.enum";
import { PaymentDetailEntity } from "./root.entity";

@ChildEntity(EPaymentDetailKind.FORM_POST)
export class PaymentDetailFormPostEntity extends PaymentDetailEntity {
	@Column({ nullable: true, type: "varchar" })
	@ApiPropertyDescribe({
		description: "action url",
		exampleValue: "https://example.com",
		format: EApiPropertyStringType.STRING,
		maxLength: 128,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public actionUrl!: string;

	@ApiPropertyDescribe({
		dataType: PaymentDetailFormFieldItemDto,
		description: "fields",
		isArray: true,
		isUniqueItems: false,
		maxItems: 100,
		minItems: 0,
		shouldValidateNested: true,
		type: EApiPropertyDescribeType.OBJECT,
	})
	@OneToMany(() => PaymentDetailFormFieldEntity, ({ detail }: PaymentDetailFormFieldEntity) => detail, { eager: true })
	public fields!: Array<Relation<PaymentDetailFormFieldEntity>>;
}
