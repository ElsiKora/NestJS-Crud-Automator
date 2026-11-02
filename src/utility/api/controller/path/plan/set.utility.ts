import type { IApiControllerPathPlan } from "@interface/class/api/controller/path";

import { API_CONTROLLER_PATH_PLAN_METADATA_KEY } from "./metadata-key.constant";

/**
 * Attaches a compiled path plan to a generated controller method.
 * @param {object} target - Controller prototype that owns the generated method.
 * @param {string} methodName - Generated controller method name.
 * @param {IApiControllerPathPlan} plan - Validated controller path plan.
 * @returns {void}
 */
export function ApiControllerPathPlanSet(target: object, methodName: string, plan: IApiControllerPathPlan): void {
	Reflect.defineMetadata(API_CONTROLLER_PATH_PLAN_METADATA_KEY, plan, target, methodName);
}
