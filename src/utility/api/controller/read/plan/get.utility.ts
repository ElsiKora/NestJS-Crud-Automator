import type { IApiControllerReadPlan } from "@interface/class/api/controller/read";

import { API_CONTROLLER_READ_PLAN_METADATA_KEY } from "./metadata-key.constant";

/**
 * Returns the compiled generated-read plan attached to a controller method.
 * @param {object} target - Controller prototype that owns the generated method.
 * @param {string} methodName - Generated controller method name.
 * @returns {IApiControllerReadPlan | undefined} Stored read plan, when configured.
 */
export function ApiControllerReadPlanGet(target: object, methodName: string): IApiControllerReadPlan | undefined {
	return Reflect.getMetadata(API_CONTROLLER_READ_PLAN_METADATA_KEY, target, methodName) as IApiControllerReadPlan | undefined;
}
