import { ApiPropertyDescribe } from "@decorator/api/property/describe.decorator";
import { EApiPropertyDescribeType, EApiPropertyStringType } from "@enum/decorator/api";
import { Entity, ManyToOne, PrimaryColumn } from "typeorm";

import { TypedQueryEntity } from "./entity";

@Entity("typed_query_tags")
export class TypedQueryTagEntity {
	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "tag id",
		exampleValue: "tag-1",
		format: EApiPropertyStringType.STRING,
		maxLength: 64,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public id!: string;

	@ManyToOne(() => TypedQueryEntity, (entity: TypedQueryEntity) => entity.tags)
	public entity!: TypedQueryEntity;
}
