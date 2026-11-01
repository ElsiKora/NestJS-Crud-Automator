import "reflect-metadata";

import { ApiPropertyDescribe, EApiPropertyDescribeType } from "../../../../src/index";
import { JoinTable, ManyToMany } from "typeorm";

import { E2eHydrationTagEntity } from "./tag.entity";

export abstract class E2eHydrationTaggedEntity {
	@ApiPropertyDescribe({
		description: "tags",
		type: EApiPropertyDescribeType.RELATION,
	})
	@JoinTable({ name: "e2e_hydration_post_tags" })
	@ManyToMany(() => E2eHydrationTagEntity)
	public tags?: Array<E2eHydrationTagEntity>;
}
