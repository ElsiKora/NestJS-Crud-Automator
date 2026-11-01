import "reflect-metadata";

import { ApiPropertyDescribe, EApiPropertyDescribeType, EApiPropertyStringType } from "../../../src/index";
import { ChildEntity, Column } from "typeorm";

import { ETemporalEntryKind } from "./kind.enum";
import { StiTemporalEntryEntity } from "./root.entity";

@ChildEntity(ETemporalEntryKind.CREDIT)
export class StiTemporalCreditEntryEntity extends StiTemporalEntryEntity {
	@Column({ nullable: true, type: "varchar" })
	@ApiPropertyDescribe({ description: "credit note", exampleValue: "C-1", format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING })
	public creditNote!: string;
}
