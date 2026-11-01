import "reflect-metadata";

import { ApiPropertyDescribe, EApiPropertyDescribeType, EApiPropertyStringType } from "../../../src/index";
import { Column, Entity, JoinTable, ManyToMany, ManyToOne, OneToMany, PrimaryColumn } from "typeorm";

@Entity("e2e_to_many_authors")
export class E2eToManyAuthorEntity {
	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "id",
		type: EApiPropertyDescribeType.UUID,
	})
	public id!: string;
}

@Entity("e2e_to_many_tags")
export class E2eToManyTagEntity {
	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "id",
		type: EApiPropertyDescribeType.UUID,
	})
	public id!: string;
}

@Entity("e2e_to_many_posts")
export class E2eToManyPostEntity {
	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "id",
		type: EApiPropertyDescribeType.UUID,
	})
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "title",
		exampleValue: "Post",
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
	@ManyToOne(() => E2eToManyAuthorEntity, { nullable: true })
	public author?: E2eToManyAuthorEntity | null;

	@ApiPropertyDescribe({
		description: "comments",
		type: EApiPropertyDescribeType.RELATION,
	})
	@OneToMany(() => E2eToManyCommentEntity, (comment: E2eToManyCommentEntity): E2eToManyPostEntity => comment.post)
	public comments?: Array<E2eToManyCommentEntity>;

	@ApiPropertyDescribe({
		description: "tags",
		type: EApiPropertyDescribeType.RELATION,
	})
	@JoinTable({ name: "e2e_to_many_post_tags" })
	@ManyToMany(() => E2eToManyTagEntity)
	public tags?: Array<E2eToManyTagEntity>;
}

@Entity("e2e_to_many_comments")
export class E2eToManyCommentEntity {
	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "id",
		type: EApiPropertyDescribeType.UUID,
	})
	public id!: string;

	@ManyToOne(() => E2eToManyPostEntity, (post: E2eToManyPostEntity): Array<E2eToManyCommentEntity> | undefined => post.comments, { nullable: false })
	public post!: E2eToManyPostEntity;
}
