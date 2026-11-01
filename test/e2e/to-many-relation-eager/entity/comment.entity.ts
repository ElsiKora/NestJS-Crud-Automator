import "reflect-metadata";

import { ApiPropertyDescribe, EApiPropertyDescribeType, EApiPropertyStringType } from "../../../../src/index";
import { Column, Entity, ManyToOne, PrimaryColumn, type Relation } from "typeorm";

import { E2eEagerPostEntity } from "./post.entity";

@Entity("e2e_eager_comments")
export class E2eEagerCommentEntity {
	@PrimaryColumn({ type: "uuid" })
	@ApiPropertyDescribe({
		description: "id",
		type: EApiPropertyDescribeType.UUID,
	})
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "body",
		exampleValue: "Value",
		format: EApiPropertyStringType.STRING,
		maxLength: 64,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public body!: string;

	@ManyToOne(() => E2eEagerPostEntity, (post: E2eEagerPostEntity): Array<E2eEagerCommentEntity> | undefined => post.comments, { nullable: true, onDelete: "CASCADE" })
	public post?: null | Relation<E2eEagerPostEntity>;
}
