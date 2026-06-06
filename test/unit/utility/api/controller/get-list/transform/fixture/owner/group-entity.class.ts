import type { TApiPropertyDescribeProperties } from "@type/decorator/api/property";

import { ApiPropertyDescribe } from "@decorator/api/property/describe.decorator";
import { EApiPropertyDescribeType } from "@enum/decorator/api";
import { Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("owner_groups")
export class OwnerGroupEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({
		type: EApiPropertyDescribeType.UUID,
		description: "owner group id",
	} as TApiPropertyDescribeProperties)
	public id!: string;
}
