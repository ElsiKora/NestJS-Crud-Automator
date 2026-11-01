import "reflect-metadata";

import { ApiPropertyDescribe, EApiPropertyDescribeType } from "../../../../src/index";
import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("e2e_to_many_authors")
export class E2eToManyAuthorEntity {
	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "id",
		type: EApiPropertyDescribeType.UUID,
	})
	public id!: string;

	@Column({ nullable: true, type: "varchar" })
	public code?: null | string;
}
