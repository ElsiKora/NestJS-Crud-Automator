import type { IApiControllerGetListQueryPlan } from "@interface/class/api/controller/get-list/query";

import { CONTROLLER_API_DECORATOR_CONSTANT } from "@constant/decorator/api";

/**
 * Reads the immutable GET_LIST query plan registered for one generated route.
 * @param {object} target - Generated controller prototype.
 * @param {string} methodName - Generated route method name.
 * @returns {IApiControllerGetListQueryPlan | undefined} Registered plan, or undefined for a legacy route.
 */
export function ApiControllerGetListQueryPlanGet(target: object, methodName: string): IApiControllerGetListQueryPlan | undefined {
	return Reflect.getMetadata(CONTROLLER_API_DECORATOR_CONSTANT.GET_LIST_QUERY_PLAN_METADATA_KEY, target, methodName) as IApiControllerGetListQueryPlan | undefined;
}
