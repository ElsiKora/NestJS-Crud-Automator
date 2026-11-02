import "reflect-metadata";

import { Column } from "typeorm";

// Embedded columns without describe metadata: IAM reads their type from TypeORM alone.
export class E2eIamBooleanItemMeta {
	@Column({ default: false, type: "boolean" })
	public isLocked!: boolean;
}
