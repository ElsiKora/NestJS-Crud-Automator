import "reflect-metadata";

import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

import { ApiPropertyDescribe, EApiDtoType, EApiPropertyDescribeType, EApiPropertyNumberType, EApiPropertyStringType, EApiRouteType } from "../../../src/index";

import { E2eListHiddenUserGuard } from "./guard";

const INTEGER = { exampleValue: 1, format: EApiPropertyNumberType.INTEGER, maximum: 1000, minimum: 0, multipleOf: 1, type: EApiPropertyDescribeType.NUMBER } as const;
const HIDDEN_IN_LIST = { [EApiRouteType.GET_LIST]: { [EApiDtoType.RESPONSE]: { isExpose: false, isResponse: true } } } as const;

@Entity("e2e_list_hidden_owners")
export class E2eListHiddenOwnerEntity {
	@Column({ type: "int" })
	@ApiPropertyDescribe({ description: "code", ...INTEGER, properties: HIDDEN_IN_LIST })
	public code!: number;

	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@Column({ type: "int" })
	@ApiPropertyDescribe({ description: "level", ...INTEGER })
	public level!: number;
}

@Entity("e2e_list_hidden_items")
export class E2eListHiddenItemEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({ description: "label", exampleValue: "Label", format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 1, pattern: "/^[A-Za-z0-9 ]+$/", type: EApiPropertyDescribeType.STRING })
	public label!: string;

	// The route guard of every controller here sees this column on no response.
	@Column({ type: "int" })
	@ApiPropertyDescribe({ description: "note", ...INTEGER, properties: { [EApiRouteType.GET_LIST]: { [EApiDtoType.RESPONSE]: { guard: { guards: [E2eListHiddenUserGuard], isInverse: true } } } } })
	public note!: number;

	@ManyToOne(() => E2eListHiddenOwnerEntity, { nullable: true })
	@ApiPropertyDescribe({ description: "owner", type: EApiPropertyDescribeType.RELATION })
	public owner?: E2eListHiddenOwnerEntity;

	@Column({ select: false, type: "int" })
	@ApiPropertyDescribe({ description: "pin", ...INTEGER })
	public pin!: number;

	@Column({ type: "int" })
	@ApiPropertyDescribe({ description: "rank", ...INTEGER })
	public rank!: number;

	@Column({ type: "int" })
	@ApiPropertyDescribe({ description: "secret", ...INTEGER, properties: HIDDEN_IN_LIST })
	public secret!: number;
}
