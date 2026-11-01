import type { Relation } from "typeorm";

import { Column, Entity, OneToMany, PrimaryColumn } from "typeorm";

import { KeyPageDayEntity } from "./key-page-day.entity";

// Operands of a transformed date condition, in the order the transformer received them.
export const KEY_PAGE_CALENDAR_INPUTS: Array<unknown> = [];

@Entity({ name: "key_page_calendars" })
export class KeyPageCalendarEntity {
	@OneToMany(() => KeyPageDayEntity, (day: KeyPageDayEntity) => day.calendar)
	public days!: Relation<Array<KeyPageDayEntity>>;

	@Column({ transformer: { from: (value: unknown): unknown => value, to: (value: unknown): unknown => (KEY_PAGE_CALENDAR_INPUTS.push(value), value instanceof Date ? value.toISOString().slice(0, "YYYY-MM-DD".length) : value) }, type: "date" })
	public dueOn!: Date;

	@PrimaryColumn({ type: "uuid" })
	public id!: string;

	@Column({ type: "date", unique: true })
	public openedOn!: string;
}
