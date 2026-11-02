import "reflect-metadata";

import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

import { ApiPropertyDescribe, EApiPropertyDescribeType, EApiPropertyStringType } from "../../../../src/index";

// Both files declare entity classes with these names on purpose.
@Entity("e2e_same_name_relation_first_owners")
export class SameNameRelationOwnerEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ description: "first owner id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({ description: "only on the first owner", exampleValue: "value", format: EApiPropertyStringType.STRING, maxLength: 32, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING })
	public onlyOnA!: string;
}

@Entity("e2e_same_name_relation_first_holders")
export class SameNameRelationHolderEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ description: "first holder id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@ManyToOne(() => SameNameRelationOwnerEntity)
	@ApiPropertyDescribe({ description: "first owner", type: EApiPropertyDescribeType.RELATION })
	public owner!: SameNameRelationOwnerEntity;
}
