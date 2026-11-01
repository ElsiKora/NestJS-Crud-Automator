import "reflect-metadata";

import { ApiPropertyDescribe, EApiPropertyDateIdentifier, EApiPropertyDateType, EApiPropertyDescribeType, EApiPropertyNumberType } from "../../../src/index";
import { Column, Entity, PrimaryColumn } from "typeorm";

// A transformer that accepts only a Date fails whenever TypeORM hands it an operator or a bound text value.
const DATE_ONLY_TRANSFORMER = {
	from: (value: unknown): unknown => value,
	to: (value: unknown): unknown => {
		if (!(value instanceof Date)) {
			throw new TypeError("stamp transformer expects a Date");
		}

		return value;
	},
};

@Entity({ name: "e2e_temporal_stamps" })
export class E2eTemporalStampEntity {
	@PrimaryColumn({ type: "uuid" })
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@Column({ precision: 3, transformer: DATE_ONLY_TRANSFORMER, type: "timestamp" })
	@ApiPropertyDescribe({ format: EApiPropertyDateType.DATE_TIME, identifier: EApiPropertyDateIdentifier.DATE, type: EApiPropertyDescribeType.DATE })
	public localStampedAt!: Date;

	@Column({ type: "int" })
	@ApiPropertyDescribe({ description: "sequence", exampleValue: 1, format: EApiPropertyNumberType.INTEGER, maximum: 1000, minimum: 0, multipleOf: 1, type: EApiPropertyDescribeType.NUMBER })
	public sequence!: number;

	@Column({ precision: 3, transformer: DATE_ONLY_TRANSFORMER, type: "timestamptz" })
	@ApiPropertyDescribe({ format: EApiPropertyDateType.DATE_TIME, identifier: EApiPropertyDateIdentifier.DATE, type: EApiPropertyDescribeType.DATE })
	public stampedAt!: Date;
}
