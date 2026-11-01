import "reflect-metadata";

import type { Relation } from "typeorm";

import { ApiPropertyDescribe, EApiPropertyDateIdentifier, EApiPropertyDateType, EApiPropertyDescribeType, EApiPropertyNumberType } from "../../../src/index";
import { Column, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, PrimaryColumn, TableInheritance } from "typeorm";

import { StiTemporalAccountEntity } from "./account.entity";
import { ETemporalEntryKind } from "./kind.enum";

@Entity({ name: "sti_temporal_entries" })
@TableInheritance({ column: { enum: ETemporalEntryKind, enumName: "sti_temporal_entry_kind", name: "kind", type: "enum" } })
export class StiTemporalEntryEntity {
	@ManyToOne(() => StiTemporalAccountEntity)
	@JoinColumn({ name: "accountId" })
	@ApiPropertyDescribe({ description: "account", type: EApiPropertyDescribeType.RELATION })
	public account!: Relation<StiTemporalAccountEntity>;

	@Column({ type: "uuid" })
	@ApiPropertyDescribe({ description: "accountId", type: EApiPropertyDescribeType.UUID })
	public accountId!: string;

	@Column({ precision: 3, type: "timestamptz" })
	@ApiPropertyDescribe({ format: EApiPropertyDateType.DATE_TIME, identifier: EApiPropertyDateIdentifier.DATE, type: EApiPropertyDescribeType.DATE })
	public bookedAt!: Date;

	@PrimaryColumn({ type: "uuid" })
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@Column({ enum: ETemporalEntryKind, enumName: "sti_temporal_entry_kind", type: "enum" })
	@ApiPropertyDescribe({ description: "kind", enum: ETemporalEntryKind, enumName: "ETemporalEntryKind", type: EApiPropertyDescribeType.ENUM })
	public kind!: ETemporalEntryKind;

	@PrimaryColumn({ precision: 3, type: "timestamptz" })
	@ApiPropertyDescribe({ format: EApiPropertyDateType.DATE_TIME, identifier: EApiPropertyDateIdentifier.CREATED_AT, type: EApiPropertyDescribeType.DATE })
	public postedAt!: Date;

	@Column({ type: "int" })
	@ApiPropertyDescribe({ description: "sequence", exampleValue: 1, format: EApiPropertyNumberType.INTEGER, maximum: 1000, minimum: 0, multipleOf: 1, type: EApiPropertyDescribeType.NUMBER })
	public sequence!: number;

	@JoinTable({
		inverseJoinColumns: [{ name: "accountId", referencedColumnName: "id" }],
		joinColumns: [
			{ name: "entryId", referencedColumnName: "id" },
			{ name: "entryPostedAt", referencedColumnName: "postedAt" },
		],
		name: "sti_temporal_entry_watchers",
	})
	@ManyToMany(() => StiTemporalAccountEntity)
	public watchers!: Relation<Array<StiTemporalAccountEntity>>;
}
