import "reflect-metadata";

import { ChildEntity, JoinTable, ManyToMany } from "typeorm";

import { E2eHydrationDetailEntity } from "./detail.entity";
import { E2eHydrationTagEntity } from "./tag.entity";

@ChildEntity("CARD")
export class E2eHydrationCardDetailEntity extends E2eHydrationDetailEntity {
	@JoinTable({ name: "e2e_hydration_card_tags" })
	@ManyToMany(() => E2eHydrationTagEntity)
	public cardTags?: Array<E2eHydrationTagEntity>;
}
