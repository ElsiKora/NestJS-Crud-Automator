import "reflect-metadata";

import { ApiPropertyDescribe, EApiPropertyDescribeType } from "../../../../src/index";
import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("e2e_to_many_tags")
export class E2eToManyTagEntity {
	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "id",
		type: EApiPropertyDescribeType.UUID,
	})
	public id!: string;

	@Column({ nullable: true, type: "varchar" })
	public code?: null | string;
}
