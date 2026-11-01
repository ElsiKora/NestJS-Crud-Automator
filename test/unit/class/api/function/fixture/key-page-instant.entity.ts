import type { Relation } from "typeorm";

import { Column, Entity, ManyToOne, PrimaryColumn } from "typeorm";

import { KeyPageLedgerEntity } from "./key-page-ledger.entity";

// Inputs the transformers received, in call order; the shifting transformer fails on anything but a `Date`.
export const KEY_PAGE_INSTANT_INPUTS: Array<unknown> = [];

const shiftInstant = (value: unknown): unknown => {
	KEY_PAGE_INSTANT_INPUTS.push(value);

	if (!(value instanceof Date)) {
		throw new TypeError("instant transformer expects a Date");
	}

	return new Date(value.getTime() + 1000);
};

export class KeyPageInstantWindow {
	@Column({ precision: 3, type: "timestamptz" })
	public startsAt!: Date;
}

@Entity({ name: "key_page_instants" })
export class KeyPageInstantEntity {
	@PrimaryColumn({ type: "uuid" })
	public id!: string;

	@ManyToOne(() => KeyPageLedgerEntity, { createForeignKeyConstraints: false })
	public ledger!: Relation<KeyPageLedgerEntity>;

	@Column({ transformer: { from: (value: unknown): unknown => value, to: (value: unknown): unknown => value }, type: "int" })
	public count!: number;

	@Column({ precision: 3, type: "timestamp" })
	public localAt!: Date;

	@Column({ precision: 3, transformer: { from: (value: unknown): unknown => value, to: shiftInstant }, type: "timestamp" })
	public localTransformedAt!: Date;

	@Column({
		precision: 3,
		transformer: [
			{ from: (value: unknown): unknown => value, to: shiftInstant },
			{
				from: (value: unknown): unknown => value,
				to: (value: unknown): unknown => {
					KEY_PAGE_INSTANT_INPUTS.push("second");

					return value;
				},
			},
		],
		type: "timestamptz",
	})
	public orderedAt!: Date;

	// The entity holds text that the transformer turns into a Date only on the way to the database.
	@Column({ precision: 3, transformer: { from: (value: unknown): unknown => value, to: (value: unknown): unknown => (typeof value === "string" ? new Date(value) : value) }, type: "timestamptz" })
	public parsedAt!: string;

	@Column({ precision: 3, type: "timestamptz" })
	public plainAt!: Date;

	@Column({ precision: 3, transformer: { from: (value: unknown): unknown => value, to: (value: unknown): unknown => (value instanceof Date ? value.toISOString().replace("Z", "+00:00") : value) }, type: "timestamptz" })
	public textAt!: Date;

	@Column({ precision: 3, transformer: { from: (value: unknown): unknown => value, to: (value: unknown): unknown => (KEY_PAGE_INSTANT_INPUTS.push(value), value instanceof Date ? value : `tag:${String(value)}`) }, type: "timestamptz" })
	public taggedAt!: Date;

	@Column({ precision: 3, transformer: { from: (value: unknown): unknown => value, to: shiftInstant }, type: "timestamptz" })
	public transformedAt!: Date;

	@Column(() => KeyPageInstantWindow)
	public window!: KeyPageInstantWindow;
}
