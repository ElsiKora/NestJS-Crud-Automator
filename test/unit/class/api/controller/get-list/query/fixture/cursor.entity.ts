import type { Type } from "@nestjs/common";
import type { IAuthGuard } from "@nestjs/passport";

import { ApiPropertyDescribe } from "@decorator/api/property/describe.decorator";
import { EApiDtoType, EApiPropertyDescribeType, EApiPropertyNumberType, EApiPropertyStringType, EApiRouteType } from "@enum/decorator/api";
import { Column, Entity, PrimaryColumn } from "typeorm";

import { CursorResponseGuard } from "./cursor-response.guard";

@Entity("cursor_query_entities")
export class CursorQueryEntity {
	@PrimaryColumn({ type: "uuid" })
	@ApiPropertyDescribe({
		description: "id",
		type: EApiPropertyDescribeType.UUID,
	})
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "name",
		exampleValue: "Cursor",
		format: EApiPropertyStringType.STRING,
		maxLength: 64,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public name!: string;

	@Column({ type: "int" })
	@ApiPropertyDescribe({
		description: "rank",
		exampleValue: 1,
		format: EApiPropertyNumberType.INTEGER,
		maximum: 100,
		minimum: 0,
		multipleOf: 1,
		type: EApiPropertyDescribeType.NUMBER,
	})
	public rank!: number;

	@Column({ select: false, type: "varchar" })
	@ApiPropertyDescribe({
		description: "hidden cursor value",
		exampleValue: "hidden",
		format: EApiPropertyStringType.STRING,
		maxLength: 64,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public hiddenValue!: string;

	@Column({ default: 0, type: "int" })
	@ApiPropertyDescribe({
		description: "response-hidden rank",
		exampleValue: 1,
		format: EApiPropertyNumberType.INTEGER,
		maximum: 100,
		minimum: 0,
		multipleOf: 1,
		properties: {
			[EApiRouteType.GET_LIST]: {
				[EApiDtoType.RESPONSE]: {
					isEnabled: false,
				},
			},
		},
		type: EApiPropertyDescribeType.NUMBER,
	})
	public responseHiddenRank!: number;

	@Column({ default: 0, type: "int" })
	@ApiPropertyDescribe({
		description: "response-guarded rank",
		exampleValue: 1,
		format: EApiPropertyNumberType.INTEGER,
		maximum: 100,
		minimum: 0,
		multipleOf: 1,
		properties: {
			[EApiRouteType.GET_LIST]: {
				[EApiDtoType.RESPONSE]: {
					guard: {
						guards: CursorResponseGuard as Type<IAuthGuard>,
					},
				},
			},
		},
		type: EApiPropertyDescribeType.NUMBER,
	})
	public responseGuardedRank!: number;

	@Column({ nullable: true, type: "int" })
	@ApiPropertyDescribe({
		description: "nullable rank",
		exampleValue: 1,
		format: EApiPropertyNumberType.INTEGER,
		isNullable: true,
		maximum: 100,
		minimum: 0,
		multipleOf: 1,
		type: EApiPropertyDescribeType.NUMBER,
	})
	public nullableRank?: number;
}
