import "reflect-metadata";

import { ApiPropertyDescribe, EApiPropertyDescribeType, EApiPropertyStringType } from "../../../../src/index";
import { Column, Entity, JoinTable, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn, type Relation } from "typeorm";

import { E2eHydrationNoteEntity } from "./note.entity";
import { E2eHydrationOwnerEntity } from "./owner.entity";
import { E2eHydrationTagEntity } from "./tag.entity";

@Entity("e2e_hydration_posts")
export class E2eHydrationPostEntity {
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
		description: "notes",
		type: EApiPropertyDescribeType.RELATION,
	})
	@OneToMany(() => E2eHydrationNoteEntity, (note: E2eHydrationNoteEntity): null | Relation<E2eHydrationPostEntity> | undefined => note.post)
	public notes?: Array<E2eHydrationNoteEntity>;

	@ApiPropertyDescribe({
		description: "tags",
		type: EApiPropertyDescribeType.RELATION,
	})
	@JoinTable({ name: "e2e_hydration_post_tags" })
	@ManyToMany(() => E2eHydrationTagEntity)
	public tags?: Array<E2eHydrationTagEntity>;
}
