import { ApiPropertyDescribe } from "@decorator/api/property/describe.decorator";
import { EApiPropertyDescribeType } from "@enum/decorator/api";
import { CursorInheritedBaseEntity } from "@test/unit/class/api/controller/get-list/query/fixture/cursor-inherited-base.entity";
import { Entity, PrimaryColumn } from "typeorm";

@Entity("cursor_inherited_query_entities")
export class CursorInheritedQueryEntity extends CursorInheritedBaseEntity {
	@PrimaryColumn({ type: "uuid" })
	@ApiPropertyDescribe({
		description: "id",
		type: EApiPropertyDescribeType.UUID,
	})
	public id!: string;
}
