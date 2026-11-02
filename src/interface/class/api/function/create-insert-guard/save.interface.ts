import type { TApiEntityReference } from "@type/api-entity-reference.type";

export interface IApiFunctionCreateInsertGuardSave {
	/** Entity of the create function, named in the refusal. */
	entity: TApiEntityReference;
	/** Whether TypeORM is about to insert the row the create function saves. */
	isInserted: boolean;
}
