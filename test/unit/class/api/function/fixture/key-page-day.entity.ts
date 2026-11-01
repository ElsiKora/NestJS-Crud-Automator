import type { Relation } from "typeorm";

import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";

import { KeyPageCalendarEntity } from "./key-page-calendar.entity";

@Entity({ name: "key_page_days" })
export class KeyPageDayEntity {
	@JoinColumn({ name: "calendarOpenedOn", referencedColumnName: "openedOn" })
	@ManyToOne(() => KeyPageCalendarEntity, (calendar: KeyPageCalendarEntity) => calendar.days)
	public calendar!: Relation<KeyPageCalendarEntity>;

	@PrimaryColumn({ type: "date" })
	public day!: string;

	@PrimaryColumn({ type: "uuid" })
	public id!: string;
}
