import "reflect-metadata";

import { ApiPropertyDescribe, EApiPropertyDescribeType, EApiPropertyStringType } from "../../../../src/index";
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, type Relation } from "typeorm";

import { E2eToManyAuthorEntity } from "./author.entity";

@Entity("e2e_to_many_ledgers")
export class E2eToManyLedgerEntity {
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

	@Column({ nullable: true, type: "simple-json" })
	public items?: Array<string> | null;

	@ApiPropertyDescribe({
		description: "owner",
		type: EApiPropertyDescribeType.RELATION,
	})
	@ManyToOne(() => E2eToManyAuthorEntity, { nullable: true })
	public owner?: null | Relation<E2eToManyAuthorEntity>;
}
