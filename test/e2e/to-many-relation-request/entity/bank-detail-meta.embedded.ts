import "reflect-metadata";

import { Column, JoinTable, ManyToMany } from "typeorm";

import { E2eHydrationTagEntity } from "./tag.entity";

/** Embedded BANK metadata whose ManyToMany is reachable only through the dotted path bankMeta.bankExtras. */
export class E2eHydrationBankDetailMeta {
	@JoinTable({ name: "e2e_hydration_bank_extras" })
	@ManyToMany(() => E2eHydrationTagEntity)
	public bankExtras?: Array<E2eHydrationTagEntity>;

	@Column({ nullable: true, type: "varchar" })
	public note?: null | string;
}
