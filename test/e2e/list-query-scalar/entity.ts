import "reflect-metadata";

import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";

import { ApiPropertyDescribe, EApiPropertyDescribeType, EApiPropertyNumberType, EApiPropertyStringType } from "../../../src/index";

@Entity("e2e_list_scalar_accounts")
export class E2eListScalarAccountEntity {
	@PrimaryColumn({ type: "uuid" })
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({ description: "name", exampleValue: "Main", format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING })
	public name!: string;
}

@Entity("e2e_list_scalar_keys")
export class E2eListScalarKeyEntity {
	@PrimaryColumn({ type: "uuid" })
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({ description: "label", exampleValue: "Alpha", format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING })
	public label!: string;

	@Column({ type: "int" })
	@ApiPropertyDescribe({ description: "amount", exampleValue: 1, format: EApiPropertyNumberType.INTEGER, maximum: 1000, minimum: 0, multipleOf: 1, type: EApiPropertyDescribeType.NUMBER })
	public amount!: number;

	@Column({ nullable: true, type: "uuid" })
	@ApiPropertyDescribe({ description: "accountId", isNullable: true, type: EApiPropertyDescribeType.UUID })
	public accountId?: null | string;

	@ManyToOne(() => E2eListScalarAccountEntity, { nullable: true })
	@JoinColumn({ name: "accountId" })
	@ApiPropertyDescribe({
		description: "account",
		relationMetadata: { entity: E2eListScalarAccountEntity, isEager: false, relationType: "many-to-one" },
		type: EApiPropertyDescribeType.RELATION,
	} as unknown as { description: string; type: EApiPropertyDescribeType.RELATION })
	public account?: E2eListScalarAccountEntity | null;
}
