import { ApiPropertyDescribe } from "@decorator/api/property/describe.decorator";
import { EApiPropertyDescribeType } from "@enum/decorator/api";
import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";

@Entity("uuid_relation_currencies")
export class UuidRelationCurrencyEntity {
	@PrimaryColumn({ type: "uuid" })
	@ApiPropertyDescribe({
		description: "id",
		type: EApiPropertyDescribeType.UUID,
	})
	public id!: string;
}

@Entity("uuid_relation_transactions")
export class UuidRelationTransactionEntity {
	@PrimaryColumn({ type: "uuid" })
	@ApiPropertyDescribe({
		description: "id",
		type: EApiPropertyDescribeType.UUID,
	})
	public id!: string;

	@ManyToOne(() => UuidRelationCurrencyEntity)
	@JoinColumn({ name: "currencyId" })
	@ApiPropertyDescribe({
		description: "currency",
		type: EApiPropertyDescribeType.RELATION,
	} as never)
	public currency!: UuidRelationCurrencyEntity;
}
