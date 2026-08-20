import { ApiPropertyDescribe } from "@decorator/api/property/describe.decorator";
import { EApiPropertyDescribeType, EApiPropertyNumberType } from "@enum/decorator/api";
import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("cursor_unsafe_field_name_entities")
export class CursorUnsafeFieldNameQueryEntity {
	@PrimaryColumn({ type: "uuid" })
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@Column({ type: "int" })
	@ApiPropertyDescribe({ description: "numeric field name", exampleValue: 1, format: EApiPropertyNumberType.INTEGER, maximum: 100, minimum: 0, multipleOf: 1, type: EApiPropertyDescribeType.NUMBER })
	public ["2"]!: number;

	@Column({ type: "int" })
	@ApiPropertyDescribe({ description: "prototype field name", exampleValue: 1, format: EApiPropertyNumberType.INTEGER, maximum: 100, minimum: 0, multipleOf: 1, type: EApiPropertyDescribeType.NUMBER })
	public ["__proto__"]!: number;
}
