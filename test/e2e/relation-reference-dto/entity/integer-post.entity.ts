import "reflect-metadata";

import { ApiPropertyDescribe, EApiPropertyDescribeType, EApiPropertyNumberType } from "../../../../src/index";
import { Entity, JoinTable, ManyToMany, ManyToOne, PrimaryColumn, PrimaryGeneratedColumn, type Relation } from "typeorm";

@Entity("e2e_relation_reference_integer_targets")
export class E2eRelationReferenceIntegerTargetEntity {
	@ApiPropertyDescribe({
		description: "id",
		exampleValue: 1,
		format: EApiPropertyNumberType.INTEGER,
		maximum: 1000,
		minimum: 1,
		multipleOf: 1,
		type: EApiPropertyDescribeType.NUMBER,
	})
	@PrimaryColumn({ type: "int" })
	public id!: number;
}

@Entity("e2e_relation_reference_integer_posts")
export class E2eRelationReferenceIntegerPostEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({
		description: "id",
		type: EApiPropertyDescribeType.UUID,
	})
	public id!: string;

	@ApiPropertyDescribe({
		description: "target",
		type: EApiPropertyDescribeType.RELATION,
	})
	@ManyToOne(() => E2eRelationReferenceIntegerTargetEntity, { nullable: true })
	public target?: null | Relation<E2eRelationReferenceIntegerTargetEntity>;

	@ApiPropertyDescribe({
		description: "targets",
		type: EApiPropertyDescribeType.RELATION,
	})
	@JoinTable({ name: "e2e_relation_reference_integer_post_targets" })
	@ManyToMany(() => E2eRelationReferenceIntegerTargetEntity)
	public targets?: Array<E2eRelationReferenceIntegerTargetEntity>;

	@ApiPropertyDescribe({
		description: "watcher",
		type: EApiPropertyDescribeType.RELATION,
	})
	@ManyToOne(() => E2eRelationReferenceIntegerTargetEntity, { eager: true, nullable: true })
	public watcher?: null | Relation<E2eRelationReferenceIntegerTargetEntity>;
}
