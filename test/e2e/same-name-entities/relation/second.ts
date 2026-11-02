import "reflect-metadata";

import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

import { ApiPropertyDescribe, EApiPropertyDescribeType, EApiPropertyStringType } from "../../../../src/index";

// Both files declare entity classes with these names on purpose.
@Entity("e2e_same_name_relation_second_owners")
export class SameNameRelationOwnerEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ description: "second owner id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({ description: "only on the second owner", exampleValue: "value", format: EApiPropertyStringType.STRING, maxLength: 32, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING })
	public onlyOnB!: string;
}

// The primary key is `code`; `id` is an ordinary column here, unlike on the first holder.
@Entity("e2e_same_name_relation_second_holders")
export class SameNameRelationHolderEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ description: "second holder code", type: EApiPropertyDescribeType.UUID })
	public code!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({ description: "second holder id", exampleValue: "value", format: EApiPropertyStringType.STRING, maxLength: 32, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING })
	public id!: string;

	@ManyToOne(() => SameNameRelationOwnerEntity)
	@ApiPropertyDescribe({ description: "second owner", type: EApiPropertyDescribeType.RELATION })
	public owner!: SameNameRelationOwnerEntity;
}
