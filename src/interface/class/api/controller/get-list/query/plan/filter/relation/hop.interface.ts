import type { TMetadataStorageTarget } from "@type/class";

/**
 * One relation a filter path crosses, or the two owning relations of a link entity.
 */
export interface IApiControllerGetListQueryPlanFilterRelationHop {
	/** Entity class that holds the relation: the entity before it, or the link entity. */
	entity: TMetadataStorageTarget;
	/** Property of the relation that leads on. */
	relation: string;
	/** Property of the link entity's relation that points back at the entity before it; only a link hop has one. */
	source?: string;
	/** Entity class the relation leads to. */
	target: TMetadataStorageTarget;
}
