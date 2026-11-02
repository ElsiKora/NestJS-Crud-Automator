import "reflect-metadata";

import { Column } from "typeorm";

// Embedded columns on the item itself: TypeORM always loads the embedded object, so its paths are never missing.
export class E2eIamParityItemMeta {
	@Column({ default: false, type: "boolean" })
	public isLocked!: boolean;

	@Column({ length: 32, nullable: true, type: "varchar" })
	public note?: null | string;
}
