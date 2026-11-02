import "reflect-metadata";

import { ChildEntity, Column } from "typeorm";

import { ApiPropertyDescribe, EApiPropertyDescribeType, EApiPropertyStringType } from "../../../src/index";

import { E2eInheritedOrderStiRootEntity } from "./sti-root.entity";

@ChildEntity("child")
export class E2eInheritedOrderStiChildEntity extends E2eInheritedOrderStiRootEntity {
	@Column({ type: "varchar" })
	@ApiPropertyDescribe({ description: "extra", exampleValue: "Extra", format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 1, pattern: "/^[A-Za-z0-9 ]+$/", type: EApiPropertyDescribeType.STRING })
	public extra!: string;
}
