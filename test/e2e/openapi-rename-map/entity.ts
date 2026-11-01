import "reflect-metadata";

import { Column, Entity, PrimaryColumn } from "typeorm";

import { ApiPropertyDescribe, EApiDtoType, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "../../../src/index";

import { E2eRenameMapAdminGuard } from "./guard";

@Entity("e2e_rename_map_items")
export class E2eRenameMapItemEntity {
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
				[EApiDtoType.RESPONSE]: { guard: { guards: E2eRenameMapAdminGuard } },
			},
			[EApiRouteType.GET_LIST]: {
				[EApiDtoType.RESPONSE]: { guard: { guards: E2eRenameMapAdminGuard } },
			},
		},
		type: EApiPropertyDescribeType.STRING,
	})
	public secret!: string;
}

@Entity("e2e_rename_map_records")
export class E2eRenameMapRecordEntity {
	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "id",
		exampleValue: "record-1",
		format: EApiPropertyStringType.STRING,
		maxLength: 64,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "title",
		exampleValue: "Record",
		format: EApiPropertyStringType.STRING,
		maxLength: 64,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public title!: string;
}
