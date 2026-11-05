import "reflect-metadata";

import { Column, CreateDateColumn, DeleteDateColumn, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToMany, PrimaryColumn } from "typeorm";

import { ApiPropertyDescribe, EApiPropertyDateIdentifier, EApiPropertyDateType, EApiPropertyDescribeType, EApiPropertyNumberType, EApiPropertyStringType } from "../../../src/index";

export enum ERelationFilterState {
	ACTIVE = "ACTIVE",
	INACTIVE = "INACTIVE",
}

const describeId = (): PropertyDecorator => ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID });

const describeState = (): PropertyDecorator => ApiPropertyDescribe({ description: "state", enum: ERelationFilterState, enumName: "ERelationFilterState", type: EApiPropertyDescribeType.ENUM });

const describeText = (description: string): PropertyDecorator => ApiPropertyDescribe({ description, exampleValue: "text", format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING });

const describeScore = (): PropertyDecorator => ApiPropertyDescribe({ description: "score", exampleValue: 1, format: EApiPropertyNumberType.INTEGER, maximum: 100, minimum: 0, multipleOf: 1, type: EApiPropertyDescribeType.NUMBER });

const describeDate = (): PropertyDecorator => ApiPropertyDescribe({ format: EApiPropertyDateType.DATE_TIME, identifier: EApiPropertyDateIdentifier.DATE, type: EApiPropertyDescribeType.DATE });

const describeHiddenRelation = (description: string): PropertyDecorator => ApiPropertyDescribe({ description, isAutoDtoEnabled: false, type: EApiPropertyDescribeType.RELATION });

@Entity("relation_filter_providers")
export class RelationFilterProviderEntity {
	@Column({ length: 16, type: "varchar" })
	@describeText("code")
	public code!: string;

	@CreateDateColumn()
	@describeDate()
	public foundedAt!: Date;

	@describeId()
	@PrimaryColumn({ type: "uuid" })
	public id!: string;

	@Column({ type: "int" })
	@describeScore()
	public score!: number;

	@Column({ length: 16, type: "varchar" })
	@describeState()
	public state!: ERelationFilterState;
}

@Entity("relation_filter_categories")
export class RelationFilterCategoryEntity {
	@DeleteDateColumn()
	public deletedAt?: Date | null;

	@describeId()
	@PrimaryColumn({ type: "uuid" })
	public id!: string;

	@Column({ length: 16, type: "varchar" })
	@describeState()
	public state!: ERelationFilterState;
}

@Entity("relation_filter_sources")
export class RelationFilterSourceEntity {
	@Column({ type: "uuid" })
	public gameId!: string;

	@describeId()
	@PrimaryColumn({ type: "uuid" })
	public id!: string;

	@describeHiddenRelation("provider")
	@JoinColumn({ name: "providerId", referencedColumnName: "id" })
	@ManyToOne(() => RelationFilterProviderEntity, { nullable: true })
	public provider!: null | RelationFilterProviderEntity;

	@Column({ nullable: true, type: "uuid" })
	public providerId!: null | string;
}

// The shape of Core's game: a composite to-one hop, hidden, and no property that leads to a category.
@Entity("relation_filter_games")
export class RelationFilterGameEntity {
	@describeHiddenRelation("game source")
	@JoinColumn([
		{ name: "id", referencedColumnName: "gameId" },
		{ name: "gameSourceId", referencedColumnName: "id" },
	])
	@ManyToOne(() => RelationFilterSourceEntity, { createForeignKeyConstraints: false, nullable: true })
	public gameSource!: null | RelationFilterSourceEntity;

	@Column({ nullable: true, type: "uuid" })
	public gameSourceId!: null | string;

	@describeId()
	@PrimaryColumn({ type: "uuid" })
	public id!: string;

	@Column({ length: 16, type: "varchar" })
	@describeText("region")
	public region!: string;
}

@Entity("relation_filter_category_games")
export class RelationFilterCategoryGameEntity {
	@JoinColumn({ name: "categoryId" })
	@ManyToOne(() => RelationFilterCategoryEntity)
	public category!: RelationFilterCategoryEntity;

	@Column({ type: "uuid" })
	public categoryId!: string;

	@DeleteDateColumn()
	public deletedAt?: Date | null;

	@JoinColumn({ name: "gameId" })
	@ManyToOne(() => RelationFilterGameEntity)
	public game!: RelationFilterGameEntity;

	@Column({ type: "uuid" })
	public gameId!: string;

	@describeId()
	@PrimaryColumn({ type: "uuid" })
	public id!: string;
}

// A second link from the game to the same target table, which needs a name of its own.
@Entity("relation_filter_featured_categories")
export class RelationFilterFeaturedCategoryEntity {
	@JoinColumn({ name: "categoryId" })
	@ManyToOne(() => RelationFilterCategoryEntity)
	public category!: RelationFilterCategoryEntity;

	@Column({ type: "uuid" })
	public categoryId!: string;

	@JoinColumn({ name: "gameId" })
	@ManyToOne(() => RelationFilterGameEntity)
	public game!: RelationFilterGameEntity;

	@Column({ type: "uuid" })
	public gameId!: string;

	@describeId()
	@PrimaryColumn({ type: "uuid" })
	public id!: string;
}

// A link whose target leads on, so its field crosses one more relation.
@Entity("relation_filter_game_source_links")
export class RelationFilterGameSourceLinkEntity {
	@JoinColumn({ name: "gameId" })
	@ManyToOne(() => RelationFilterGameEntity)
	public game!: RelationFilterGameEntity;

	@Column({ type: "uuid" })
	public gameId!: string;

	@describeId()
	@PrimaryColumn({ type: "uuid" })
	public id!: string;

	@JoinColumn({ name: "sourceId" })
	@ManyToOne(() => RelationFilterSourceEntity)
	public source!: RelationFilterSourceEntity;

	@Column({ type: "uuid" })
	public sourceId!: string;
}

// The same edge with an inverse property on the route entity, with nothing describing it.
@Entity("relation_filter_inverse_games")
export class RelationFilterInverseGameEntity {
	@OneToMany(() => RelationFilterInverseLinkEntity, (link: RelationFilterInverseLinkEntity) => link.game)
	public categoryLinks!: Array<RelationFilterInverseLinkEntity>;

	@describeId()
	@PrimaryColumn({ type: "uuid" })
	public id!: string;

	@Column({ length: 16, type: "varchar" })
	@describeText("region")
	public region!: string;
}

@Entity("relation_filter_inverse_links")
export class RelationFilterInverseLinkEntity {
	@JoinColumn({ name: "categoryId" })
	@ManyToOne(() => RelationFilterCategoryEntity)
	public category!: RelationFilterCategoryEntity;

	@Column({ type: "uuid" })
	public categoryId!: string;

	@DeleteDateColumn()
	public deletedAt?: Date | null;

	@JoinColumn({ name: "gameId" })
	@ManyToOne(() => RelationFilterInverseGameEntity, (game: RelationFilterInverseGameEntity) => game.categoryLinks)
	public game!: RelationFilterInverseGameEntity;

	@Column({ type: "uuid" })
	public gameId!: string;

	@describeId()
	@PrimaryColumn({ type: "uuid" })
	public id!: string;
}

// The same model through a ManyToMany with a JoinTable on the route entity.
@Entity("relation_filter_tagged_games")
export class RelationFilterTaggedGameEntity {
	@JoinTable({ name: "relation_filter_tagged_game_categories" })
	@ManyToMany(() => RelationFilterCategoryEntity)
	public categories!: Array<RelationFilterCategoryEntity>;

	@describeId()
	@PrimaryColumn({ type: "uuid" })
	public id!: string;

	@Column({ length: 16, type: "varchar" })
	@describeText("region")
	public region!: string;
}

// A route entity with a real column of the same meaning as the relation filter, which stays a plain direct filter.
@Entity("relation_filter_column_games")
export class RelationFilterColumnGameEntity {
	@Column({ nullable: true, type: "uuid" })
	@describeId()
	public categoryId!: null | string;

	@describeId()
	@PrimaryColumn({ type: "uuid" })
	public id!: string;

	@Column({ length: 16, type: "varchar" })
	@describeText("region")
	public region!: string;
}

@Entity("relation_filter_column_links")
export class RelationFilterColumnLinkEntity {
	@JoinColumn({ name: "categoryId" })
	@ManyToOne(() => RelationFilterCategoryEntity)
	public category!: RelationFilterCategoryEntity;

	@Column({ type: "uuid" })
	public categoryId!: string;

	@DeleteDateColumn()
	public deletedAt?: Date | null;

	@JoinColumn({ name: "gameId" })
	@ManyToOne(() => RelationFilterColumnGameEntity)
	public game!: RelationFilterColumnGameEntity;

	@Column({ type: "uuid" })
	public gameId!: string;

	@describeId()
	@PrimaryColumn({ type: "uuid" })
	public id!: string;
}

// A route entity whose relation is visible, so a one-hop path is what a typed plan offers already.
@Entity("relation_filter_offers")
export class RelationFilterOfferEntity {
	@describeId()
	@PrimaryColumn({ type: "uuid" })
	public id!: string;

	@ApiPropertyDescribe({ description: "provider", type: EApiPropertyDescribeType.RELATION })
	@JoinColumn({ name: "providerId" })
	@ManyToOne(() => RelationFilterProviderEntity, { eager: true, nullable: true })
	public provider!: null | RelationFilterProviderEntity;

	@Column({ nullable: true, type: "uuid" })
	public providerId!: null | string;
}

export const RELATION_FILTER_ENTITIES: Array<new () => unknown> = [RelationFilterCategoryEntity, RelationFilterCategoryGameEntity, RelationFilterColumnGameEntity, RelationFilterColumnLinkEntity, RelationFilterFeaturedCategoryEntity, RelationFilterGameEntity, RelationFilterGameSourceLinkEntity, RelationFilterInverseGameEntity, RelationFilterInverseLinkEntity, RelationFilterOfferEntity, RelationFilterProviderEntity, RelationFilterSourceEntity, RelationFilterTaggedGameEntity];
