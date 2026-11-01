import "reflect-metadata";

import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

import { ApiPropertyDescribe, EApiPropertyDateIdentifier, EApiPropertyDateType, EApiPropertyDescribeType, EApiPropertyStringType } from "../../../src/index";

@Entity("e2e_body_temporal_events")
export class E2eBodyTemporalEventEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "label",
		exampleValue: "Label",
		format: EApiPropertyStringType.STRING,
		maxLength: 64,
		minLength: 1,
		pattern: "/^[A-Za-z0-9 ]+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public label!: string;

	@Column({ type: "date" })
	@ApiPropertyDescribe({ format: EApiPropertyDateType.DATE, identifier: EApiPropertyDateIdentifier.DATE, type: EApiPropertyDescribeType.DATE })
	public happensOn!: string;

	@Column()
	@ApiPropertyDescribe({ format: EApiPropertyDateType.DATE_TIME, identifier: EApiPropertyDateIdentifier.DATE, type: EApiPropertyDescribeType.DATE })
	public startsAt!: Date;

	@Column({ type: "time" })
	@ApiPropertyDescribe({ format: EApiPropertyDateType.TIME, identifier: EApiPropertyDateIdentifier.DATE, type: EApiPropertyDescribeType.DATE })
	public opensAt!: string;
}
