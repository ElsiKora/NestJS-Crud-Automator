import type { IApiControllerReadPlan } from "@interface/class/api/controller/read";

import { API_CONTROLLER_READ_PLAN_METADATA_KEY } from "./metadata-key.constant";

/**
 * Attaches a compiled generated-read plan to a controller method.
 * @param {object} target - Controller prototype that owns the generated method.
 * @param {string} methodName - Generated controller method name.
 * @param {IApiControllerReadPlan} plan - Validated route-local read plan.
 * @returns {void}
 */
export function ApiControllerReadPlanSet(target: object, methodName: string, plan: IApiControllerReadPlan): void {
	Reflect.defineMetadata(API_CONTROLLER_READ_PLAN_METADATA_KEY, plan, target, methodName);
}
