import type { IApiControllerGetListQueryPlanCondition } from "@interface/class/api/controller/get-list/query/plan/condition.interface";

/**
 * A fixed condition of a relation filter, on a row of the subquery.
 */
export interface IApiControllerGetListQueryPlanFilterRelationCondition extends IApiControllerGetListQueryPlanCondition {
	/** Property of the column on the entity of that row. */
	field: string;
	/** Position of the row among the rows of the path: a hop has one, a link hop has its link row and then its target row. */
	rowIndex: number;
}
