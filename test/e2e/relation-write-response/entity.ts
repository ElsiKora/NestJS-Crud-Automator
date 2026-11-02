import "reflect-metadata";

import { ApiPropertyDescribe, EApiPropertyDescribeType, EApiPropertyStringType } from "../../../src/index";
import { Column, Entity, JoinTable, ManyToMany, ManyToOne, PrimaryColumn, type Relation } from "typeorm";

const describeId: PropertyDecorator = ApiPropertyDescribe({
	description: "id",
	type: EApiPropertyDescribeType.UUID,
});
const describeCode: PropertyDecorator = ApiPropertyDescribe({
	description: "code",
	exampleValue: "some-code",
	format: EApiPropertyStringType.STRING,
	maxLength: 32,
	minLength: 1,
	pattern: "/^[a-z-]+$/",
	type: EApiPropertyDescribeType.STRING,
});

@Entity("e2e_relation_write_authors")
export class E2eRelationWriteAuthorEntity {
	@describeId
	@PrimaryColumn({ type: "varchar" })
	public id!: string;

	@Column({ type: "varchar", unique: true })
	@describeCode
	public code!: string;

	@Column({ nullable: true, type: "varchar" })
	public secret?: null | string;
}

@Entity("e2e_relation_write_tags")
export class E2eRelationWriteTagEntity {
	@describeId
	@PrimaryColumn({ type: "varchar" })
	public id!: string;

	@Column({ type: "varchar", unique: true })
	@describeCode
	public code!: string;
}

@Entity("e2e_relation_write_posts")
export class E2eRelationWritePostEntity {
	@describeId
	@PrimaryColumn({ type: "varchar" })
	public id!: string;

	@Column({ type: "varchar" })
	@describeCode
	public title!: string;

	@ApiPropertyDescribe({
		description: "author",
		type: EApiPropertyDescribeType.RELATION,
	})
	@ManyToOne(() => E2eRelationWriteAuthorEntity, { nullable: true })
	public author?: null | Relation<E2eRelationWriteAuthorEntity>;

	@ApiPropertyDescribe({
		description: "editor",
		type: EApiPropertyDescribeType.RELATION,
	})
	@ManyToOne(() => E2eRelationWriteAuthorEntity, { nullable: false })
	public editor!: Relation<E2eRelationWriteAuthorEntity>;

	@ApiPropertyDescribe({
		description: "reviewer",
		type: EApiPropertyDescribeType.RELATION,
	})
	@ManyToOne(() => E2eRelationWriteAuthorEntity, { eager: true, nullable: true })
	public reviewer?: null | Relation<E2eRelationWriteAuthorEntity>;

	@ApiPropertyDescribe({
		description: "tags",
		type: EApiPropertyDescribeType.RELATION,
	})
	@JoinTable({ name: "e2e_relation_write_post_tags" })
	@ManyToMany(() => E2eRelationWriteTagEntity)
	public tags?: Array<E2eRelationWriteTagEntity>;

	@ApiPropertyDescribe({
		description: "labels",
		type: EApiPropertyDescribeType.RELATION,
	})
	@JoinTable({ name: "e2e_relation_write_post_labels" })
	@ManyToMany(() => E2eRelationWriteTagEntity, { eager: true })
	public labels?: Array<E2eRelationWriteTagEntity>;
}

@Entity("e2e_relation_write_composite_rows")
export class E2eRelationWriteCompositeEntity {
	@describeId
	@PrimaryColumn({ type: "varchar" })
	public id!: string;

	@describeCode
	@PrimaryColumn({ type: "varchar" })
	public part!: string;

	@Column({ type: "varchar" })
	@describeCode
	public title!: string;
}
