import type { IApiControllerIdentityPlan } from "@interface/class/api/controller/identity-plan.interface";

import { API_CONTROLLER_IDENTITY_PLAN_METADATA_KEY } from "./metadata-key.constant";

/**
 * Stores a compiled generated GET identity plan on controller method metadata.
 * @param {object} handler - Exact generated handler function.
 * @param {IApiControllerIdentityPlan} plan - Compiled identity plan.
 * @returns {void}
 */
export function ApiControllerIdentityPlanSet(handler: object, plan: IApiControllerIdentityPlan): void {
	Reflect.defineMetadata(API_CONTROLLER_IDENTITY_PLAN_METADATA_KEY, plan, handler);
}
