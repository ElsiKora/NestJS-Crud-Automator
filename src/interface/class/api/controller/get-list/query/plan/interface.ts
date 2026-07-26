import type { IApiControllerGetListQueryPlanFilter } from "./filter";
import type { IApiControllerGetListQueryPlanOrder } from "./order";

export interface IApiControllerGetListQueryPlan {
	controllerName: string;
	filter: IApiControllerGetListQueryPlanFilter;
	order: IApiControllerGetListQueryPlanOrder;
	schemaName: string;
	signature: string;
}
