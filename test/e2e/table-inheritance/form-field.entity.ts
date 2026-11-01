import type { Relation } from "typeorm";

import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";

import { ApiPropertyDescribe, EApiPropertyDescribeType, EApiPropertyStringType } from "../../../src/index";

import { PaymentDetailFormPostEntity } from "./form-post.entity";

@Entity("payment_detail_form_fields")
export class PaymentDetailFormFieldEntity {
	@PrimaryColumn({ type: "uuid" })
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@Column({ type: "uuid" })
	@ApiPropertyDescribe({ description: "detail id", type: EApiPropertyDescribeType.UUID })
	public detailId!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "name",
		exampleValue: "amount",
		format: EApiPropertyStringType.STRING,
		maxLength: 64,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public name!: string;

	@JoinColumn({ name: "detailId" })
	@ManyToOne(() => PaymentDetailFormPostEntity, ({ fields }: PaymentDetailFormPostEntity) => fields)
	public detail!: Relation<PaymentDetailFormPostEntity>;
}
