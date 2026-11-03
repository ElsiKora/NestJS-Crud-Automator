import "reflect-metadata";

import { Column, Entity, ManyToOne, PrimaryColumn, PrimaryGeneratedColumn, type Relation } from "typeorm";

import { ApiPropertyDescribe, EApiPropertyDescribeType, EApiPropertyStringType } from "../../../src/index";

const LABEL_DESCRIBE = { description: "label", exampleValue: "Label", format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING } as const;

@Entity("e2e_uuid_canonical_parents")
export class E2eUuidCanonicalParentEntity {
	@PrimaryColumn({ type: "uuid" })
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe(LABEL_DESCRIBE)
	public label!: string;
}

@Entity("e2e_uuid_canonical_items")
export class E2eUuidCanonicalItemEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe(LABEL_DESCRIBE)
	public label!: string;

	@Column({ type: "uuid" })
	@ApiPropertyDescribe({ description: "ownerId", type: EApiPropertyDescribeType.UUID })
	public ownerId!: string;

	@ApiPropertyDescribe({ description: "parent", type: EApiPropertyDescribeType.RELATION })
	@ManyToOne(() => E2eUuidCanonicalParentEntity, { nullable: true })
	public parent?: null | Relation<E2eUuidCanonicalParentEntity>;
}
