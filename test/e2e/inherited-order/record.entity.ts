import "reflect-metadata";

import { Column, Entity } from "typeorm";

import { ApiPropertyDescribe, EApiPropertyDescribeType, EApiPropertyStringType } from "../../../src/index";

import { E2eInheritedOrderBaseEntity } from "./base.entity";

@Entity("e2e_inherited_order_records")
export class E2eInheritedOrderRecordEntity extends E2eInheritedOrderBaseEntity {
	@Column({ type: "varchar" })
	@ApiPropertyDescribe({ description: "label", exampleValue: "Label", format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 1, pattern: "/^[A-Za-z0-9 ]+$/", type: EApiPropertyDescribeType.STRING })
	public label!: string;
}
