import type { EFilterOperation } from "@enum/filter";

export interface IApiControllerGetListQueryPlanCondition {
	operation: EFilterOperation;
	value?: unknown;
	values?: ReadonlyArray<unknown>;
}
