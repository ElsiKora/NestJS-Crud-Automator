import type { IApiControllerGetListQueryPlanFilterRelationHop } from "@interface/class/api/controller/get-list/query/plan/filter/relation";
import type { TMetadataStorageTarget } from "@type/class";

/**
 * What a relation filter key names, read from the TypeORM decorators of the entities it crosses.
 */
export interface IApiControllerGetListQueryRelationFilterPath {
	/** The relations of the path, in order. */
	hops: ReadonlyArray<IApiControllerGetListQueryPlanFilterRelationHop>;
	/** Entity class of the column the value compares. */
	leafEntity: TMetadataStorageTarget;
	/** Property of that column. */
	leafProperty: string;
	/** The rows of the subquery a fixed condition can name: a relation names its row, a link its link row by the source relation and its target row by the target relation. */
	rows: ReadonlyArray<{ entity: TMetadataStorageTarget; name: string }>;
}
