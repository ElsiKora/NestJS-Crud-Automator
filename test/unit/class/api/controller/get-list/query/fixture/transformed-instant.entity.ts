import { ApiPropertyDescribe } from "@decorator/api/property/describe.decorator";
import { EApiPropertyDateIdentifier, EApiPropertyDateType, EApiPropertyDescribeType } from "@enum/decorator/api";
import { Column, Entity, PrimaryColumn } from "typeorm";

// Inputs the column transformer received; a transformer that expects a `Date` fails on any other value.
export const TRANSFORMED_INSTANT_INPUTS: Array<unknown> = [];

function shiftInstant(value: unknown): unknown {
	TRANSFORMED_INSTANT_INPUTS.push(value);

	if (!(value instanceof Date)) {
		throw new TypeError("instant transformer expects a Date");
	}

	return new Date(value.getTime() + 1000);
}

@Entity("transformed_instant_entities")
export class TransformedInstantQueryEntity {
	@PrimaryColumn({ type: "uuid" })
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@Column({ precision: 3, transformer: { from: (value: unknown): unknown => value, to: shiftInstant }, type: "timestamptz" })
	@ApiPropertyDescribe({ format: EApiPropertyDateType.DATE_TIME, identifier: EApiPropertyDateIdentifier.DATE, type: EApiPropertyDescribeType.DATE })
	public transformedTimestamptz!: Date;
}
