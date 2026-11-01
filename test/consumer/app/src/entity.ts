import "reflect-metadata";

import { ApiPropertyDescribe, EApiPropertyDescribeType, EApiPropertyNumberType, EApiPropertyStringType } from "@elsikora/nestjs-crud-automator";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";

@Entity("smoke_owners")
export class SmokeOwnerEntity {
	@PrimaryColumn({ type: "uuid" })
	@ApiPropertyDescribe({ description: "owner id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({ description: "owner name", exampleValue: "Owner", format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING })
	public name!: string;
}

@Entity("smoke_items")
export class SmokeItemEntity {
	@Column({ type: "int" })
	@ApiPropertyDescribe({ description: "count", exampleValue: 1, format: EApiPropertyNumberType.INTEGER, maximum: 1000, minimum: 0, multipleOf: 1, type: EApiPropertyDescribeType.NUMBER })
	public count!: number;

	@PrimaryColumn({ type: "uuid" })
	@ApiPropertyDescribe({ description: "item id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({ description: "item name", exampleValue: "Item", format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING })
	public name!: string;

	@ManyToOne(() => SmokeOwnerEntity, { eager: true, nullable: false })
	@JoinColumn({ name: "ownerId" })
	@ApiPropertyDescribe({
		description: "owner",
		relationMetadata: { entity: SmokeOwnerEntity, isEager: true, relationType: "many-to-one" },
		type: EApiPropertyDescribeType.RELATION,
	} as unknown as { description: string; type: EApiPropertyDescribeType.RELATION })
	public owner!: SmokeOwnerEntity;

	@Column({ type: "uuid" })
	@ApiPropertyDescribe({ description: "owner id", type: EApiPropertyDescribeType.UUID })
	public ownerId!: string;
}
