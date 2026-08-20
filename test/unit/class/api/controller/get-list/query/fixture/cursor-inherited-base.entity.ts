import { ApiPropertyDescribe } from "@decorator/api/property/describe.decorator";
import { EApiPropertyDescribeType, EApiPropertyNumberType } from "@enum/decorator/api";
import { Column } from "typeorm";

export class CursorInheritedBaseEntity {
	@Column({ nullable: true, type: "int" })
	@ApiPropertyDescribe({
		description: "inherited nullable rank",
		exampleValue: 1,
		format: EApiPropertyNumberType.INTEGER,
		maximum: 100,
		minimum: 0,
		multipleOf: 1,
		type: EApiPropertyDescribeType.NUMBER,
	})
	public inheritedNullableRank?: number;
}
