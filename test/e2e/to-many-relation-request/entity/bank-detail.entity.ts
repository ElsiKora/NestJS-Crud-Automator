import "reflect-metadata";

import { ChildEntity, Column, JoinTable, ManyToMany } from "typeorm";

import { E2eHydrationBankDetailMeta } from "./bank-detail-meta.embedded";
import { E2eHydrationDetailEntity } from "./detail.entity";
import { E2eHydrationTagEntity } from "./tag.entity";

@ChildEntity("BANK")
export class E2eHydrationBankDetailEntity extends E2eHydrationDetailEntity {
	@JoinTable({ name: "e2e_hydration_bank_tags" })
	@ManyToMany(() => E2eHydrationTagEntity)
	public bankTags?: Array<E2eHydrationTagEntity>;

	@Column(() => E2eHydrationBankDetailMeta)
	public bankMeta?: E2eHydrationBankDetailMeta;
}
