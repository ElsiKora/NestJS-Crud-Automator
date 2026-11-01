import "reflect-metadata";

import { ApiPropertyDescribe, EApiPropertyDescribeType } from "../../../../src/index";
import { Entity, ManyToOne, PrimaryColumn, type Relation } from "typeorm";

import { E2eHydrationPostEntity } from "./post.entity";

@Entity("e2e_hydration_attachments")
export class E2eHydrationAttachmentEntity {
	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "id",
		type: EApiPropertyDescribeType.UUID,
	})
	public id!: string;

	@ManyToOne(() => E2eHydrationPostEntity, (post: E2eHydrationPostEntity): Array<E2eHydrationAttachmentEntity> | undefined => post.attachments, { nullable: false, onDelete: "CASCADE" })
	public post!: Relation<E2eHydrationPostEntity>;
}
