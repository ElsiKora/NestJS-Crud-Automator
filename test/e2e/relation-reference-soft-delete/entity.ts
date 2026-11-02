import "reflect-metadata";

import { ApiPropertyDescribe, EApiPropertyDescribeType, EApiPropertyNumberType, EApiPropertyStringType } from "../../../src/index";
import { Column, DeleteDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, type Relation } from "typeorm";

@Entity("e2e_relation_soft_targets")
export class E2eRelationSoftTargetEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({
		description: "id",
		type: EApiPropertyDescribeType.UUID,
	})
	public id!: string;

	@Column({ type: "varchar", unique: true })
	@ApiPropertyDescribe({
		description: "code",
		exampleValue: "code",
		format: EApiPropertyStringType.STRING,
		maxLength: 32,
		minLength: 1,
		pattern: "/^[a-z-]+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public code!: string;

	@DeleteDateColumn()
	public deletedAt?: Date | null;
}

@Entity("e2e_relation_soft_posts")
export class E2eRelationSoftPostEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({
		description: "id",
		type: EApiPropertyDescribeType.UUID,
	})
	public id!: string;

	@Column({ type: "int" })
	@ApiPropertyDescribe({
		description: "rank",
		exampleValue: 1,
		format: EApiPropertyNumberType.INTEGER,
		maximum: 100,
		minimum: 0,
		multipleOf: 1,
		type: EApiPropertyDescribeType.NUMBER,
	})
	public rank!: number;

	@ApiPropertyDescribe({
		description: "target",
		type: EApiPropertyDescribeType.RELATION,
	})
	@ManyToOne(() => E2eRelationSoftTargetEntity, { nullable: false })
	public target!: Relation<E2eRelationSoftTargetEntity>;

	@ApiPropertyDescribe({
		description: "watcher",
		type: EApiPropertyDescribeType.RELATION,
	})
	@ManyToOne(() => E2eRelationSoftTargetEntity, { eager: true, nullable: false })
	public watcher!: Relation<E2eRelationSoftTargetEntity>;
}
