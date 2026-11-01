import "reflect-metadata";

import { Column, Entity, PrimaryColumn } from "typeorm";

import { ApiPropertyDescribe, EApiDtoType, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "../../../src/index";

import { E2eDtoNameAdminGuard } from "./guard";

@Entity("e2e_dto_name_items")
export class E2eDtoNameItemEntity {
	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "id",
		exampleValue: "item-1",
		format: EApiPropertyStringType.STRING,
		maxLength: 64,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "name",
		exampleValue: "Item",
		format: EApiPropertyStringType.STRING,
		maxLength: 64,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public name!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "secret",
		exampleValue: "Secret",
		format: EApiPropertyStringType.STRING,
		maxLength: 64,
		minLength: 1,
		pattern: "/^.+$/",
		properties: {
			[EApiRouteType.GET]: {
				[EApiDtoType.RESPONSE]: { guard: { guards: E2eDtoNameAdminGuard } },
			},
			[EApiRouteType.GET_LIST]: {
				[EApiDtoType.RESPONSE]: { guard: { guards: E2eDtoNameAdminGuard } },
			},
		},
		type: EApiPropertyDescribeType.STRING,
	})
	public secret!: string;
}
