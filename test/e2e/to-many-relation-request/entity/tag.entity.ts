import "reflect-metadata";

import { ApiPropertyDescribe, EApiPropertyDescribeType } from "../../../../src/index";
import { Entity, PrimaryColumn } from "typeorm";

@Entity("e2e_hydration_tags")
export class E2eHydrationTagEntity {
	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "id",
		type: EApiPropertyDescribeType.UUID,
	})
	public id!: string;
}
