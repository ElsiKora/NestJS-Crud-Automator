import "reflect-metadata";

import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

import { ApiPropertyDescribe, EApiPropertyDescribeType } from "../../../src/index";

import { E2eFreeFormItemDto } from "./dto";

@Entity("e2e_free_form_records")
export class E2eFreeFormRecordEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@Column({ type: "simple-json" })
	@ApiPropertyDescribe({
		dataType: Object,
		description: "payloads",
		isArray: true,
		isUniqueItems: false,
		maxItems: 5,
		minItems: 0,
		shouldValidateNested: true,
		type: EApiPropertyDescribeType.OBJECT,
	})
	public payloads!: Array<Record<string, unknown>>;

	@Column({ type: "simple-json" })
	@ApiPropertyDescribe({
		dataType: E2eFreeFormItemDto,
		description: "item",
		shouldValidateNested: true,
		type: EApiPropertyDescribeType.OBJECT,
	})
	public item!: E2eFreeFormItemDto;
}
