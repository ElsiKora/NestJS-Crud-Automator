import "reflect-metadata";

import { ApiPropertyDescribe, EApiPropertyDescribeType, EApiPropertyStringType } from "../../../src/index";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";

@Entity("e2e_uuid_currencies")
export class E2eUuidCurrencyEntity {
	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "id",
		type: EApiPropertyDescribeType.UUID,
	})
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "code",
		exampleValue: "USD",
		format: EApiPropertyStringType.STRING,
		maxLength: 16,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public code!: string;
}

@Entity("e2e_uuid_transactions")
export class E2eUuidTransactionEntity {
	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "id",
		type: EApiPropertyDescribeType.UUID,
	})
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "label",
		exampleValue: "Deposit",
		format: EApiPropertyStringType.STRING,
		maxLength: 64,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public label!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "currencyId",
		type: EApiPropertyDescribeType.UUID,
	})
	public currencyId!: string;

	@ManyToOne(() => E2eUuidCurrencyEntity)
	@JoinColumn({ name: "currencyId" })
	@ApiPropertyDescribe({
		description: "currency",
		relationMetadata: {
			entity: E2eUuidCurrencyEntity,
			isEager: false,
			relationType: "many-to-one",
		},
		type: EApiPropertyDescribeType.RELATION,
	} as unknown as { description: string; type: EApiPropertyDescribeType.RELATION })
	public currency!: E2eUuidCurrencyEntity;
}
