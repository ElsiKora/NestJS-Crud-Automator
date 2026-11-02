import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

import { ApiPropertyDescribe, EApiPropertyDescribeType, EApiPropertyStringType } from "../../../../src/index";

// Both files declare this class with one property name and different rules on purpose.
@Entity("e2e_same_name_rules_digit")
export class SameNameRulesEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({ description: "label", exampleValue: "123", format: EApiPropertyStringType.STRING, maxLength: 6, minLength: 1, pattern: "/^[0-9]+$/", type: EApiPropertyDescribeType.STRING })
	public label!: string;
}
