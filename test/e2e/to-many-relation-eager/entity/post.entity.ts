import "reflect-metadata";

import { ApiPropertyDescribe, EApiPropertyDescribeType, EApiPropertyNumberType, EApiPropertyStringType } from "../../../../src/index";
import { Column, Entity, JoinTable, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn, type Relation } from "typeorm";

import { E2eEagerAuthorEntity } from "./author.entity";
import { E2eEagerCommentEntity } from "./comment.entity";
import { E2eEagerTagEntity } from "./tag.entity";

@Entity("e2e_eager_posts")
export class E2eEagerPostEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({
		description: "id",
		type: EApiPropertyDescribeType.UUID,
	})
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "ownerId",
		exampleValue: "owner-a",
		format: EApiPropertyStringType.STRING,
		maxLength: 64,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public ownerId!: string;

	@Column({ type: "integer" })
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
		description: "title",
		exampleValue: "Value",
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
	@ManyToOne(() => E2eEagerAuthorEntity, { eager: true, nullable: true })
	public author?: null | Relation<E2eEagerAuthorEntity>;

	@ApiPropertyDescribe({
		description: "comments",
		type: EApiPropertyDescribeType.RELATION,
	})
	@OneToMany(() => E2eEagerCommentEntity, (comment: E2eEagerCommentEntity): null | Relation<E2eEagerPostEntity> | undefined => comment.post, { eager: true })
	public comments?: Array<E2eEagerCommentEntity>;

	@ApiPropertyDescribe({
		description: "tags",
		type: EApiPropertyDescribeType.RELATION,
	})
	@JoinTable({ name: "e2e_eager_post_tags" })
	@ManyToMany(() => E2eEagerTagEntity, { eager: true })
	public tags?: Array<E2eEagerTagEntity>;
}
