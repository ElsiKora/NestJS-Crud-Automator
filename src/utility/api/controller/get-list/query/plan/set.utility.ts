import type { IApiControllerGetListQueryPlan } from "@interface/class/api/controller/get-list/query";

import { CONTROLLER_API_DECORATOR_CONSTANT } from "@constant/decorator/api";

/**
 * Registers one immutable GET_LIST query plan on a generated controller route.
 * @param {object} target - Generated controller prototype.
 * @param {string} methodName - Generated route method name.
 * @param {IApiControllerGetListQueryPlan} plan - Compiled immutable query plan.
 * @returns {void}
 */
export function ApiControllerGetListQueryPlanSet(target: object, methodName: string, plan: IApiControllerGetListQueryPlan): void {
	Reflect.defineMetadata(CONTROLLER_API_DECORATOR_CONSTANT.GET_LIST_QUERY_PLAN_METADATA_KEY, plan, target, methodName);
}
