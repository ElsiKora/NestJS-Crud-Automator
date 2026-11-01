import { ApiPropertyDescribe } from "@decorator/api/property/describe.decorator";
import { EApiPropertyDateIdentifier, EApiPropertyDateType, EApiPropertyDescribeType, EApiPropertyNumberType } from "@enum/decorator/api";
import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("composite_timestamp_cursor_query_entities")
export class CompositeTimestampCursorQueryEntity {
	@PrimaryColumn({ precision: 3, type: "timestamptz" })
	@ApiPropertyDescribe({ format: EApiPropertyDateType.DATE_TIME, identifier: EApiPropertyDateIdentifier.CREATED_AT, type: EApiPropertyDescribeType.DATE })
	public createdAt!: Date;

	@PrimaryColumn({ type: "uuid" })
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@Column({ type: "int" })
	@ApiPropertyDescribe({ description: "rank", exampleValue: 1, format: EApiPropertyNumberType.INTEGER, maximum: 100, minimum: 0, multipleOf: 1, type: EApiPropertyDescribeType.NUMBER })
	public rank!: number;
}
