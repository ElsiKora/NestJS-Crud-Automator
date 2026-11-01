import type { Relation } from "typeorm";

import { ApiPropertyDescribe, EApiPropertyDescribeType, EApiPropertyStringType } from "@elsikora/nestjs-crud-automator";
import { Column, Entity, OneToMany, PrimaryColumn } from "typeorm";

import { CycBookEntity } from "./book.entity.js";

@Entity("cyc_authors")
export class CycAuthorEntity {
	@PrimaryColumn({ type: "uuid" })
	@ApiPropertyDescribe({ description: "author id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({ description: "author name", exampleValue: "Ann", format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING })
	public name!: string;

	@OneToMany(() => CycBookEntity, (book: CycBookEntity) => book.author)
	@ApiPropertyDescribe({ description: "books", type: EApiPropertyDescribeType.RELATION })
	public books!: Relation<Array<CycBookEntity>>;
}
