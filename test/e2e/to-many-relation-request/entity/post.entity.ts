import "reflect-metadata";

import { ApiPropertyDescribe, EApiPropertyDescribeType, EApiPropertyStringType } from "../../../../src/index";
import { Column, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn, type Relation } from "typeorm";

import { E2eHydrationAttachmentEntity } from "./attachment.entity";
import { E2eHydrationNoteEntity } from "./note.entity";
import { E2eHydrationOwnerEntity } from "./owner.entity";
import { E2eHydrationPostMeta } from "./post-meta.embedded";
import { E2eHydrationTaggedEntity } from "./tagged.entity";

@Entity("e2e_hydration_posts")
export class E2eHydrationPostEntity extends E2eHydrationTaggedEntity {
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
		description: "owner",
		type: EApiPropertyDescribeType.RELATION,
	})
	@ManyToOne(() => E2eHydrationOwnerEntity, { nullable: true })
	public owner?: null | Relation<E2eHydrationOwnerEntity>;

	@ApiPropertyDescribe({
		description: "attachments",
		type: EApiPropertyDescribeType.RELATION,
	})
	@OneToMany(() => E2eHydrationAttachmentEntity, (attachment: E2eHydrationAttachmentEntity): Relation<E2eHydrationPostEntity> => attachment.post)
	public attachments?: Array<E2eHydrationAttachmentEntity>;

	@ApiPropertyDescribe({
		description: "notes",
		type: EApiPropertyDescribeType.RELATION,
	})
	@OneToMany(() => E2eHydrationNoteEntity, (note: E2eHydrationNoteEntity): null | Relation<E2eHydrationPostEntity> | undefined => note.post)
	public notes?: Array<E2eHydrationNoteEntity>;

	@ApiPropertyDescribe({
		description: "profile",
		type: EApiPropertyDescribeType.RELATION,
	})
	@JoinColumn()
	@OneToOne(() => E2eHydrationOwnerEntity, { nullable: true })
	public profile?: null | Relation<E2eHydrationOwnerEntity>;

	@Column(() => E2eHydrationPostMeta)
	public meta?: E2eHydrationPostMeta;
}
