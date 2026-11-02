import type { IApiControllerPathPlan } from "@interface/class/api/controller/path";

import { API_CONTROLLER_PATH_PLAN_METADATA_KEY } from "./metadata-key.constant";

/**
 * Returns the compiled path plan attached to a generated controller method.
 * @param {object} target - Controller prototype that owns the generated method.
 * @param {string} methodName - Generated controller method name.
 * @returns {IApiControllerPathPlan | undefined} Stored path plan, when the factory compiled one.
 */
export function ApiControllerPathPlanGet(target: object, methodName: string): IApiControllerPathPlan | undefined {
	return Reflect.getMetadata(API_CONTROLLER_PATH_PLAN_METADATA_KEY, target, methodName) as IApiControllerPathPlan | undefined;
}
