import "reflect-metadata";

import type { Relation } from "typeorm";

import { Column, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";

import { ApiPropertyDescribe, EApiDtoType, EApiPropertyDescribeType, EApiPropertyNumberType, EApiPropertyStringType, EApiRouteType } from "../../../src/index";

@Entity("e2e_unknown_filter_owners")
export class E2eUnknownFilterOwnerEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "name",
		exampleValue: "Ann",
		format: EApiPropertyStringType.STRING,
		maxLength: 64,
		minLength: 1,
		pattern: "/^[A-Za-z]+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public name!: string;
}

export abstract class E2eUnknownFilterCodedEntity {
	@Column({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "code declared on the base class",
		exampleValue: "A1",
		format: EApiPropertyStringType.STRING,
		maxLength: 8,
		minLength: 1,
		pattern: "/^[A-Z0-9]+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public code!: string;
}

@Entity("e2e_unknown_filter_items")
export class E2eUnknownFilterItemEntity extends E2eUnknownFilterCodedEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "label",
		exampleValue: "Label",
		format: EApiPropertyStringType.STRING,
		maxLength: 64,
		minLength: 1,
		pattern: "/^[A-Za-z]+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public label!: string;

	@ManyToOne(() => E2eUnknownFilterOwnerEntity, { nullable: false })
	@JoinColumn()
	@ApiPropertyDescribe({
		description: "owner",
		relationMetadata: { entity: E2eUnknownFilterOwnerEntity, isEager: false, relationType: "many-to-one" },
		type: EApiPropertyDescribeType.RELATION,
	} as unknown as { description: string; type: EApiPropertyDescribeType.RELATION })
	public owner!: E2eUnknownFilterOwnerEntity;

	@Column({ type: "int" })
	@ApiPropertyDescribe({
		description: "rank",
		exampleValue: 1,
		format: EApiPropertyNumberType.INTEGER,
		maximum: 1000,
		minimum: 0,
		multipleOf: 1,
		type: EApiPropertyDescribeType.NUMBER,
	})
	public rank!: number;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "described, but not published as a filter",
		exampleValue: "Secret",
		format: EApiPropertyStringType.STRING,
		maxLength: 64,
		minLength: 1,
		pattern: "/^[A-Za-z]+$/",
		properties: { [EApiRouteType.GET_LIST]: { [EApiDtoType.QUERY]: { isEnabled: false } } },
		type: EApiPropertyDescribeType.STRING,
	})
	public secret!: string;

	@OneToOne(() => E2eUnknownFilterOwnerEntity, { nullable: true })
	@JoinColumn()
	@ApiPropertyDescribe({
		description: "sponsor",
		relationMetadata: { entity: E2eUnknownFilterOwnerEntity, isEager: false, relationType: "one-to-one" },
		type: EApiPropertyDescribeType.RELATION,
	} as unknown as { description: string; type: EApiPropertyDescribeType.RELATION })
	public sponsor?: E2eUnknownFilterOwnerEntity | null;

	@OneToMany(() => E2eUnknownFilterTagEntity, ({ item }: E2eUnknownFilterTagEntity) => item)
	@ApiPropertyDescribe({ description: "tags", type: EApiPropertyDescribeType.RELATION })
	public tags!: Array<Relation<E2eUnknownFilterTagEntity>>;

	@Column({ type: "varchar" })
	public undescribed!: string;
}

@Entity("e2e_unknown_filter_tags")
export class E2eUnknownFilterTagEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@ManyToOne(() => E2eUnknownFilterItemEntity, ({ tags }: E2eUnknownFilterItemEntity) => tags, { nullable: false })
	@JoinColumn()
	public item!: Relation<E2eUnknownFilterItemEntity>;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "name",
		exampleValue: "red",
		format: EApiPropertyStringType.STRING,
		maxLength: 64,
		minLength: 1,
		pattern: "/^[a-z]+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public name!: string;
}
