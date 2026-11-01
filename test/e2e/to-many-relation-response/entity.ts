import "reflect-metadata";

import { ApiPropertyDescribe, ApiPropertyUUID, EApiPropertyDescribeType, EApiPropertyStringType } from "../../../src/index";
import { Column, Entity, JoinTable, ManyToMany, ManyToOne, OneToMany, PrimaryColumn } from "typeorm";

export class E2eToManyReviewReferenceDto {
	@ApiPropertyUUID({ entity: { name: "E2eToManyReview" }, isResponse: true })
	public id!: string;
}

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

	@ApiPropertyDescribe({
		dataType: E2eToManyReviewReferenceDto,
		description: "reviews",
		isArray: true,
		isUniqueItems: false,
		maxItems: 100,
		minItems: 0,
		shouldValidateNested: true,
		type: EApiPropertyDescribeType.OBJECT,
	})
	@OneToMany(() => E2eToManyReviewEntity, (review: E2eToManyReviewEntity): E2eToManyPostEntity => review.post)
	public reviews?: Array<E2eToManyReviewEntity>;
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

@Entity("e2e_to_many_reviews")
export class E2eToManyReviewEntity {
	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "id",
		type: EApiPropertyDescribeType.UUID,
	})
	public id!: string;

	@ManyToOne(() => E2eToManyPostEntity, (post: E2eToManyPostEntity): Array<E2eToManyReviewEntity> | undefined => post.reviews, { nullable: false })
	public post!: E2eToManyPostEntity;
}
