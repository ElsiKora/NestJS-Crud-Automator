import type { Relation } from "typeorm";

import { ApiPropertyDescribe, EApiPropertyDescribeType, EApiPropertyStringType } from "@elsikora/nestjs-crud-automator";
import { BookEntity } from "@entity/book.entity";
import { Column, Entity, OneToMany, PrimaryColumn } from "typeorm";

@Entity("swc_authors")
export class AuthorEntity {
	@PrimaryColumn({ type: "uuid" })
	@ApiPropertyDescribe({ description: "author id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({ description: "author name", exampleValue: "Ann", format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING })
	public name!: string;

	@OneToMany(() => BookEntity, (book: BookEntity) => book.author)
	@ApiPropertyDescribe({ description: "books", type: EApiPropertyDescribeType.RELATION })
	public books!: Relation<Array<BookEntity>>;
}
