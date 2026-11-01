import "reflect-metadata";

import { ApiPropertyDescribe, EApiPropertyDescribeType } from "../../../../src/index";
import { Entity, ManyToOne, PrimaryColumn, type Relation } from "typeorm";

import { E2eToManyPostEntity } from "./post.entity";

@Entity("e2e_to_many_reviews")
export class E2eToManyReviewEntity {
	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "id",
		type: EApiPropertyDescribeType.UUID,
	})
	public id!: string;

	@ManyToOne(() => E2eToManyPostEntity, (post: E2eToManyPostEntity): Array<E2eToManyReviewEntity> | undefined => post.reviews, { nullable: false })
	public post!: Relation<E2eToManyPostEntity>;
}
