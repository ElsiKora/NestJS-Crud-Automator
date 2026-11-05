import type { TMetadataStorageTarget } from "@type/class";

import type { IApiControllerGetListQueryPlanFilterRelationCondition } from "./condition.interface";
import type { IApiControllerGetListQueryPlanFilterRelationHop } from "./hop.interface";

/**
 * What a filter field crosses when it compiles to a correlated subquery.
 */
export interface IApiControllerGetListQueryPlanFilterRelation {
	/** Fixed conditions the subquery holds besides the client's value. */
	conditions: ReadonlyArray<IApiControllerGetListQueryPlanFilterRelationCondition>;
	/** The relations of the path, in order. */
	hops: ReadonlyArray<IApiControllerGetListQueryPlanFilterRelationHop>;
	/** Whether the key reaches past what a typed plan offers without a declaration, so the visibility of its intermediate relations does not apply. */
	isDeclaredReach: boolean;
	/** Entity class of the column the client's value compares. */
	leafEntity: TMetadataStorageTarget;
	/** Property of that column. */
	leafProperty: string;
}
