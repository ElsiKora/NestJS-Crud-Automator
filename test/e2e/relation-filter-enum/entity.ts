import "reflect-metadata";

import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryColumn } from "typeorm";

import { ApiPropertyDescribe, EApiPropertyDescribeType, EApiPropertyStringType } from "../../../src/index";

// Three enums that share the value ACTIVE, as Core's category and provider states do. Each column gets its own enum type on PostgreSQL.
export enum ERelationFilterEnumCategoryState {
	ACTIVE = "ACTIVE",
	INACTIVE = "INACTIVE",
}

export enum ERelationFilterEnumProviderState {
	ACTIVE = "ACTIVE",
	SUSPENDED = "SUSPENDED",
}

export enum ERelationFilterEnumTagState {
	ACTIVE = "ACTIVE",
	ARCHIVED = "ARCHIVED",
}

const describeId = (): PropertyDecorator => ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID });

const describeHiddenRelation = (description: string): PropertyDecorator => ApiPropertyDescribe({ description, isAutoDtoEnabled: false, type: EApiPropertyDescribeType.RELATION });

@Entity("relation_filter_enum_providers")
export class RelationFilterEnumProviderEntity {
	@describeId()
	@PrimaryColumn({ type: "uuid" })
	public id!: string;

	// `simple-enum` is a native enum type on PostgreSQL, MySQL and MariaDB, and a checked text column on SQLite.
	@ApiPropertyDescribe({ description: "state", enum: ERelationFilterEnumProviderState, enumName: "ERelationFilterEnumProviderState", type: EApiPropertyDescribeType.ENUM })
	@Column({ enum: ERelationFilterEnumProviderState, type: "simple-enum" })
	public state!: ERelationFilterEnumProviderState;
}

@Entity("relation_filter_enum_categories")
export class RelationFilterEnumCategoryEntity {
	@describeId()
	@PrimaryColumn({ type: "uuid" })
	public id!: string;

	@ApiPropertyDescribe({ description: "state", enum: ERelationFilterEnumCategoryState, enumName: "ERelationFilterEnumCategoryState", type: EApiPropertyDescribeType.ENUM })
	@Column({ enum: ERelationFilterEnumCategoryState, type: "simple-enum" })
	public state!: ERelationFilterEnumCategoryState;
}

@Entity("relation_filter_enum_sources")
export class RelationFilterEnumSourceEntity {
	@describeId()
	@PrimaryColumn({ type: "uuid" })
	public id!: string;

	@describeHiddenRelation("provider")
	@JoinColumn({ name: "providerId" })
	@ManyToOne(() => RelationFilterEnumProviderEntity, { nullable: true })
	public provider!: null | RelationFilterEnumProviderEntity;

	@Column({ nullable: true, type: "uuid" })
	public providerId!: null | string;
}

// The route entity: two hops to the provider, as Core's game reaches it, and a to-many relation an IAM scope reads.
@Entity("relation_filter_enum_games")
export class RelationFilterEnumGameEntity {
	@describeHiddenRelation("game source")
	@JoinColumn({ name: "gameSourceId" })
	@ManyToOne(() => RelationFilterEnumSourceEntity, { nullable: true })
	public gameSource!: null | RelationFilterEnumSourceEntity;

	@Column({ nullable: true, type: "uuid" })
	public gameSourceId!: null | string;

	@describeId()
	@PrimaryColumn({ type: "uuid" })
	public id!: string;

	@ApiPropertyDescribe({ description: "region", exampleValue: "eu", format: EApiPropertyStringType.STRING, maxLength: 16, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING })
	@Column({ length: 16, type: "varchar" })
	public region!: string;

	@describeHiddenRelation("tags")
	@OneToMany(() => RelationFilterEnumTagEntity, (tag: RelationFilterEnumTagEntity) => tag.game, { eager: true })
	public tags!: Array<RelationFilterEnumTagEntity>;
}

@Entity("relation_filter_enum_tags")
export class RelationFilterEnumTagEntity {
	@JoinColumn({ name: "gameId" })
	@ManyToOne(() => RelationFilterEnumGameEntity, (game: RelationFilterEnumGameEntity) => game.tags)
	public game!: RelationFilterEnumGameEntity;

	@Column({ type: "uuid" })
	public gameId!: string;

	@describeId()
	@PrimaryColumn({ type: "uuid" })
	public id!: string;

	@ApiPropertyDescribe({ description: "state", enum: ERelationFilterEnumTagState, enumName: "ERelationFilterEnumTagState", type: EApiPropertyDescribeType.ENUM })
	@Column({ enum: ERelationFilterEnumTagState, type: "simple-enum" })
	public state!: ERelationFilterEnumTagState;
}

@Entity("relation_filter_enum_category_games")
export class RelationFilterEnumCategoryGameEntity {
	@JoinColumn({ name: "categoryId" })
	@ManyToOne(() => RelationFilterEnumCategoryEntity)
	public category!: RelationFilterEnumCategoryEntity;

	@Column({ type: "uuid" })
	public categoryId!: string;

	@JoinColumn({ name: "gameId" })
	@ManyToOne(() => RelationFilterEnumGameEntity)
	public game!: RelationFilterEnumGameEntity;

	@Column({ type: "uuid" })
	public gameId!: string;

	@PrimaryColumn({ type: "uuid" })
	public id!: string;
}

export const RELATION_FILTER_ENUM_ENTITIES: Array<new () => object> = [RelationFilterEnumProviderEntity, RelationFilterEnumCategoryEntity, RelationFilterEnumSourceEntity, RelationFilterEnumGameEntity, RelationFilterEnumTagEntity, RelationFilterEnumCategoryGameEntity];
