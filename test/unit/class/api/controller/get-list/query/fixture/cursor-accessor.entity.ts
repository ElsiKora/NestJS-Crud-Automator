import { ApiPropertyDescribe } from "@decorator/api/property/describe.decorator";
import { EApiPropertyDescribeType, EApiPropertyNumberType } from "@enum/decorator/api";
import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("cursor_accessor_query_entities")
export class CursorAccessorQueryEntity {
	@PrimaryColumn({ type: "uuid" })
	@ApiPropertyDescribe({
		description: "id",
		type: EApiPropertyDescribeType.UUID,
	})
	public id!: string;

	@Column({ type: "int" })
	@ApiPropertyDescribe({
		description: "computed rank",
		exampleValue: 1,
		format: EApiPropertyNumberType.INTEGER,
		maximum: 100,
		minimum: 0,
		multipleOf: 1,
		type: EApiPropertyDescribeType.NUMBER,
	})
	public get rank(): number {
		return 1;
	}
}
