import type { TApiPropertyDescribeProperties } from "@type/decorator/api/property";

import { ApiPropertyDescribe } from "@decorator/api/property/describe.decorator";
import { EApiDtoType, EApiPropertyDateIdentifier, EApiPropertyDateType, EApiPropertyDescribeType, EApiPropertyNumberType, EApiPropertyStringType, EApiRouteType } from "@enum/decorator/api";
import { EFilterOrderDirection } from "@enum/filter";
import { Column, Entity, ManyToOne, OneToMany, PrimaryColumn } from "typeorm";

import { TypedQueryOwnerEntity } from "./owner.entity";
import { TypedQueryTagEntity } from "./tag.entity";

@Entity("typed_query_entities")
export class TypedQueryEntity {
	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "id",
		exampleValue: "entity-1",
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
		exampleValue: "Entity",
		format: EApiPropertyStringType.STRING,
		maxLength: 64,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public name!: string;

	@Column({ type: "int" })
	@ApiPropertyDescribe({
		description: "count",
		exampleValue: 1,
		format: EApiPropertyNumberType.INTEGER,
		maximum: 100,
		minimum: 0,
		multipleOf: 1,
		type: EApiPropertyDescribeType.NUMBER,
	})
	public count!: number;

	@Column({ type: "float" })
	@ApiPropertyDescribe({
		description: "ratio",
		exampleValue: 1.5,
		format: EApiPropertyNumberType.DOUBLE,
		maximum: 100,
		minimum: 0,
		multipleOf: 0.1,
		type: EApiPropertyDescribeType.NUMBER,
	})
	public ratio!: number;

	@Column({ type: "boolean" })
	@ApiPropertyDescribe({
		description: "enabled",
		type: EApiPropertyDescribeType.BOOLEAN,
	})
	public enabled!: boolean;

	@Column({ type: "datetime" })
	@ApiPropertyDescribe({
		format: EApiPropertyDateType.DATE_TIME,
		identifier: EApiPropertyDateIdentifier.CREATED_AT,
		type: EApiPropertyDescribeType.DATE,
	})
	public occurredAt!: Date;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "direction",
		enum: EFilterOrderDirection,
		enumName: "EFilterOrderDirection",
		type: EApiPropertyDescribeType.ENUM,
	})
	public direction!: EFilterOrderDirection;

	@Column({ type: "int" })
	@ApiPropertyDescribe({
		description: "numeric state",
		enum: {
			0: "OPEN",
			1: "CLOSED",
			CLOSED: 1,
			OPEN: 0,
		},
		enumName: "NumericQueryState",
		type: EApiPropertyDescribeType.ENUM,
	})
	public numericState!: number;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "external id",
		type: EApiPropertyDescribeType.UUID,
	})
	public externalId!: string;

	@Column({ nullable: true, type: "varchar" })
	@ApiPropertyDescribe({
		description: "code",
		exampleValue: "code-1",
		format: EApiPropertyStringType.STRING,
		isNullable: true,
		maxLength: 64,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public code?: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "hidden",
		exampleValue: "hidden",
		format: EApiPropertyStringType.STRING,
		maxLength: 64,
		minLength: 1,
		pattern: "/^.+$/",
		properties: {
			[EApiRouteType.GET_LIST]: {
				[EApiDtoType.QUERY]: {
					isEnabled: false,
				},
			},
		},
		type: EApiPropertyDescribeType.STRING,
	} as TApiPropertyDescribeProperties)
	public hidden!: string;

	@ManyToOne(() => TypedQueryOwnerEntity)
	@ApiPropertyDescribe({
		description: "owner",
		type: EApiPropertyDescribeType.RELATION,
	} as never)
	public owner!: TypedQueryOwnerEntity;

	@OneToMany(() => TypedQueryTagEntity, (tag: TypedQueryTagEntity) => tag.entity)
	@ApiPropertyDescribe({
		description: "tags",
		type: EApiPropertyDescribeType.RELATION,
	} as never)
	public tags!: Array<TypedQueryTagEntity>;
}
