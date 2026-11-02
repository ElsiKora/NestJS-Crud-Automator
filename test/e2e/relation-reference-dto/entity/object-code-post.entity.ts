import "reflect-metadata";

import { ApiPropertyDescribe, EApiPropertyDescribeType, EApiPropertyStringType } from "../../../../src/index";
import { Column, Entity, JoinTable, ManyToMany, ManyToOne, PrimaryColumn, type Relation } from "typeorm";

import { E2eRelationReferenceAuthorEntity } from "./author.entity";
import { E2eRelationReferenceTagEntity } from "./tag.entity";

@Entity("e2e_relation_reference_object_code_posts")
export class E2eRelationReferenceObjectCodePostEntity {
	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "id",
		type: EApiPropertyDescribeType.UUID,
	})
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "title",
		exampleValue: "Title",
		format: EApiPropertyStringType.STRING,
		maxLength: 64,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public title!: string;

	@ApiPropertyDescribe({
		description: "author",
		type: EApiPropertyDescribeType.RELATION,
	})
	@ManyToOne(() => E2eRelationReferenceAuthorEntity, { nullable: true })
	public author?: null | Relation<E2eRelationReferenceAuthorEntity>;

	@ApiPropertyDescribe({
		description: "editor",
		type: EApiPropertyDescribeType.RELATION,
	})
	@ManyToOne(() => E2eRelationReferenceAuthorEntity, { nullable: false })
	public editor!: Relation<E2eRelationReferenceAuthorEntity>;

	@ApiPropertyDescribe({
		description: "reviewer",
		type: EApiPropertyDescribeType.RELATION,
	})
	@ManyToOne(() => E2eRelationReferenceAuthorEntity, { eager: true, nullable: true })
	public reviewer?: null | Relation<E2eRelationReferenceAuthorEntity>;

	@ApiPropertyDescribe({
		description: "tags",
		type: EApiPropertyDescribeType.RELATION,
	})
	@JoinTable({ name: "e2e_relation_reference_object_code_post_tags" })
	@ManyToMany(() => E2eRelationReferenceTagEntity)
	public tags?: Array<E2eRelationReferenceTagEntity>;
}
