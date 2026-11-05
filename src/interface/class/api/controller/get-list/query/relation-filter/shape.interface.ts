import type { IApiControllerGetListQueryPlanFilterRelationCondition } from "@interface/class/api/controller/get-list/query/plan/filter/relation";

/**
 * The correlated subquery of one relation filter field on one DataSource, with every name escaped by its driver.
 */
export interface IApiControllerGetListQueryRelationFilterShape {
	/** Fixed conditions, each on its escaped column. */
	conditions: ReadonlyArray<{ condition: IApiControllerGetListQueryPlanFilterRelationCondition; expression: string }>;
	/** What ties the first table to the row: its escaped column and the escaped name of the column of the row. */
	correlation: ReadonlyArray<{ inner: string; outer: string }>;
	/** Escaped `FROM` clause. */
	from: string;
	/** Query path of the plain primary column of the route entity the condition attaches to. */
	key: string;
	/** Escaped column the value compares. */
	leaf: string;
	/** Escaped conditions every joined row meets, such as not being soft-deleted. */
	rowConditions: ReadonlyArray<string>;
}
