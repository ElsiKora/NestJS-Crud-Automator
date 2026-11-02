import type { TApiEntityReference } from "@type/api-entity-reference.type";

export interface IApiFunctionCreateInsertGuardSave {
	/** Entity of the create function, named in the refusal. */
	entity: TApiEntityReference;
	/** Whether TypeORM is about to insert the row the create function saves. */
	isInserted: boolean;
	/** Whether TypeORM is still broadcasting the before events of this save, from the event of its own row to the end of that synchronous loop. */
	isOpen: boolean;
	/** Row the create function saves, as it was passed to TypeORM. */
	root: object;
}
