import type { Relation } from "typeorm";

import { ChildEntity, Column, OneToMany } from "typeorm";

import { ApiPropertyDescribe, EApiPropertyDescribeType, EApiPropertyStringType } from "../../../src/index";

import { EIntegrationDetailKind } from "./kind.enum";
import { IntegrationDetailNoteItemDto } from "./note-item.dto";
import { IntegrationDetailNoteEntity } from "./note.entity";
import { IntegrationDetailEntity } from "./root.entity";

@ChildEntity(EIntegrationDetailKind.FORM)
export class IntegrationDetailFormEntity extends IntegrationDetailEntity {
	@ApiPropertyDescribe({
		description: "action url",
		exampleValue: "https://example.com",
		format: EApiPropertyStringType.STRING,
		maxLength: 128,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	@Column({ nullable: true, type: "varchar" })
	public actionUrl!: string;

	@ApiPropertyDescribe({
		dataType: IntegrationDetailNoteItemDto,
		description: "notes",
		isArray: true,
		isUniqueItems: false,
		maxItems: 100,
		minItems: 0,
		shouldValidateNested: true,
		type: EApiPropertyDescribeType.OBJECT,
	})
	@OneToMany(() => IntegrationDetailNoteEntity, ({ detail }: IntegrationDetailNoteEntity) => detail, { eager: true })
	public notes!: Array<Relation<IntegrationDetailNoteEntity>>;
}
