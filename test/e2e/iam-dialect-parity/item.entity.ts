import "reflect-metadata";

import { Column, Entity, ManyToOne, PrimaryColumn } from "typeorm";

import { ApiPropertyDescribe, EApiPropertyDescribeType, EApiPropertyStringType } from "../../../src/index";

import { E2eIamDialectOwnerEntity } from "./owner.entity";

const describeText = (description: string, maxLength: number): PropertyDecorator => ApiPropertyDescribe({ description, exampleValue: "a", format: EApiPropertyStringType.STRING, maxLength, minLength: 0, pattern: "/^.*$/", type: EApiPropertyDescribeType.STRING });

@Entity("e2e_iam_dialect_items")
export class E2eIamDialectItemEntity {
	@PrimaryColumn({ length: 36, type: "varchar" })
	@describeText("id", 36)
	public id!: string;

	// Text that differs only in letter case, accents or trailing spaces, which the default MySQL and MariaDB collations ignore.
	@Column({ length: 64, nullable: true, type: "varchar" })
	@describeText("name", 64)
	public name?: null | string;

	// An enum column: PostgreSQL refuses a value it does not declare instead of comparing it.
	@Column({ enum: ["alpha", "beta"], nullable: true, type: "simple-enum" })
	public kind?: null | string;

	// A uuid column, as Gameport's operator keys: PostgreSQL refuses text that is no UUID and reads other spellings as the lower-case one.
	@Column({ nullable: true, type: "uuid" })
	public operatorId?: null | string;

	@ManyToOne(() => E2eIamDialectOwnerEntity, { nullable: true })
	public owner?: E2eIamDialectOwnerEntity | null;

	// Columns a String operator compares by value in SQL and as text in memory.
	@Column({ nullable: true, precision: 10, scale: 2, type: "decimal" })
	public price?: null | string;

	@Column({ nullable: true, type: "int" })
	public rank?: null | number;

	@Column({ length: 36, nullable: true, type: "varchar" })
	@describeText("tenantId", 36)
	public tenantId?: null | string;
}
