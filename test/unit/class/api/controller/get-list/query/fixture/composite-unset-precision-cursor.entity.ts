import { ApiPropertyDescribe } from "@decorator/api/property/describe.decorator";
import { EApiPropertyDateIdentifier, EApiPropertyDateType, EApiPropertyDescribeType } from "@enum/decorator/api";
import { Entity, PrimaryColumn } from "typeorm";

@Entity("composite_unset_precision_cursor_query_entities")
export class CompositeUnsetPrecisionCursorQueryEntity {
	@PrimaryColumn({ type: "timestamptz" })
	@ApiPropertyDescribe({ format: EApiPropertyDateType.DATE_TIME, identifier: EApiPropertyDateIdentifier.CREATED_AT, type: EApiPropertyDescribeType.DATE })
	public createdAt!: Date;

	@PrimaryColumn({ type: "uuid" })
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;
}
