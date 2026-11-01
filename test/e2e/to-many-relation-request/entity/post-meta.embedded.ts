import "reflect-metadata";

import { Column, JoinTable, ManyToMany } from "typeorm";

import { E2eHydrationTagEntity } from "./tag.entity";

/** Embedded post metadata whose ManyToMany is reachable only through the dotted path meta.extras. */
export class E2eHydrationPostMeta {
	@JoinTable({ name: "e2e_hydration_post_extras" })
	@ManyToMany(() => E2eHydrationTagEntity)
	public extras?: Array<E2eHydrationTagEntity>;

	@Column({ nullable: true, type: "varchar" })
	public label?: null | string;
}
