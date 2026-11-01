import "reflect-metadata";

import { ApiPropertyDescribe, EApiPropertyDateIdentifier, EApiPropertyDateType, EApiPropertyDescribeType } from "../../../src/index";
import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity({ name: "e2e_cursor_transactions", synchronize: false })
export class E2eCursorTransactionEntity {
	@PrimaryColumn({ precision: 3, type: "timestamptz" })
	@ApiPropertyDescribe({ format: EApiPropertyDateType.DATE_TIME, identifier: EApiPropertyDateIdentifier.CREATED_AT, type: EApiPropertyDescribeType.DATE })
	public createdAt!: Date;

	@PrimaryColumn({ type: "uuid" })
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@Column({ precision: 3, type: "timestamp" })
	@ApiPropertyDescribe({ format: EApiPropertyDateType.DATE_TIME, identifier: EApiPropertyDateIdentifier.DATE, type: EApiPropertyDescribeType.DATE })
	public settledAt!: Date;

	@Column({ type: "uuid" })
	@ApiPropertyDescribe({ description: "wallet", type: EApiPropertyDescribeType.UUID })
	public walletId!: string;
}
