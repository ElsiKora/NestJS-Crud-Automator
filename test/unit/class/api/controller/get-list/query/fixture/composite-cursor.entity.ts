import { ApiPropertyDescribe } from "@decorator/api/property/describe.decorator";
import { EApiPropertyDescribeType, EApiPropertyStringType } from "@enum/decorator/api";
import { Entity, PrimaryColumn } from "typeorm";

@Entity("composite_cursor_query_entities")
export class CompositeCursorQueryEntity {
	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe({ description: "partition", exampleValue: "a", format: EApiPropertyStringType.STRING, maxLength: 32, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING })
	public partition!: string;

	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe({ description: "sequence", exampleValue: "1", format: EApiPropertyStringType.STRING, maxLength: 32, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING })
	public sequence!: string;
}
