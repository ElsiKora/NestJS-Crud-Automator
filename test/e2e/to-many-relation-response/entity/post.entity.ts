import "reflect-metadata";

import { ApiPropertyDescribe, EApiPropertyDescribeType, EApiPropertyStringType } from "../../../../src/index";
import { Column, Entity, JoinTable, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn, type Relation } from "typeorm";

import { E2eToManyAuthorEntity } from "./author.entity";
import { E2eToManyCommentEntity } from "./comment.entity";
import { E2eToManyReviewReferenceDto } from "./review-reference.dto";
import { E2eToManyReviewEntity } from "./review.entity";
import { E2eToManyTagEntity } from "./tag.entity";

@Entity("e2e_to_many_posts")
export class E2eToManyPostEntity {
	@PrimaryGeneratedColumn("uuid")
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
	@ManyToOne(() => E2eToManyAuthorEntity, { nullable: true })
	public author?: null | Relation<E2eToManyAuthorEntity>;

	@ApiPropertyDescribe({
		description: "comments",
		type: EApiPropertyDescribeType.RELATION,
	})
	@OneToMany(() => E2eToManyCommentEntity, (comment: E2eToManyCommentEntity): Relation<E2eToManyPostEntity> => comment.post)
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
	@OneToMany(() => E2eToManyReviewEntity, (review: E2eToManyReviewEntity): Relation<E2eToManyPostEntity> => review.post)
	public reviews?: Array<E2eToManyReviewEntity>;
}
