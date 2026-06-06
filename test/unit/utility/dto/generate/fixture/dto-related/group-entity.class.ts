import { ApiPropertyDescribe } from "@decorator/api/property/describe.decorator";
import { EApiPropertyDescribeType } from "@enum/decorator/api";
import { Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("dto_related_groups")
export class DtoRelatedGroupEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({
		description: "id",
		type: EApiPropertyDescribeType.UUID,
	})
	public id!: string;
}
