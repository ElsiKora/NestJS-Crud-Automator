import "reflect-metadata";

import { Column, Entity } from "typeorm";

import { ApiPropertyDescribe, EApiPropertyDescribeType, EApiPropertyStringType } from "../../../src/index";

import { E2eInheritedNullableArchivable } from "./archivable.mixin";
import { E2eInheritedNullableBaseEntity } from "./base.entity";

@Entity("e2e_inherited_nullable_items")
export class E2eInheritedNullableItemEntity extends E2eInheritedNullableArchivable(E2eInheritedNullableBaseEntity) {
	@Column({ type: "varchar" })
	@ApiPropertyDescribe({ description: "label", exampleValue: "Label", format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 1, pattern: "/^[A-Za-z0-9 ]+$/", type: EApiPropertyDescribeType.STRING })
	public label!: string;
}
