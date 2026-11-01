import type { Relation } from "typeorm";

import { ApiPropertyDescribe, EApiPropertyDescribeType, EApiPropertyStringType } from "@elsikora/nestjs-crud-automator";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";

import { CycAuthorEntity } from "./author.entity.js";

@Entity("cyc_books")
export class CycBookEntity {
	@PrimaryColumn({ type: "uuid" })
	@ApiPropertyDescribe({ description: "book id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({ description: "title", exampleValue: "T", format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING })
	public title!: string;

	@ManyToOne(() => CycAuthorEntity, (author: CycAuthorEntity) => author.books, { nullable: false })
	@JoinColumn({ name: "authorId" })
	@ApiPropertyDescribe({ description: "author", type: EApiPropertyDescribeType.RELATION })
	public author!: Relation<CycAuthorEntity>;

	@Column({ type: "uuid" })
	@ApiPropertyDescribe({ description: "author id", type: EApiPropertyDescribeType.UUID })
	public authorId!: string;
}
