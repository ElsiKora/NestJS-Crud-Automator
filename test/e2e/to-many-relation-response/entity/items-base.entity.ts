import "reflect-metadata";

import { Column } from "typeorm";

/** Declares `items` as a TypeORM column on a parent class only. */
export abstract class E2eToManyItemsBaseEntity {
	@Column({ nullable: true, type: "simple-json" })
	public items?: Array<string> | null;
}
