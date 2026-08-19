import type { IApiControllerIdentityPlan } from "@interface/class/api/controller/identity-plan.interface";

import { API_CONTROLLER_IDENTITY_PLAN_METADATA_KEY } from "./metadata-key.constant";

/**
 * Reads a generated GET identity plan from controller method metadata.
 * @param {object} handler - Exact generated handler function.
 * @returns {IApiControllerIdentityPlan | undefined} Stored identity plan, when configured.
 */
export function ApiControllerIdentityPlanGet(handler: object): IApiControllerIdentityPlan | undefined {
	return Reflect.getOwnMetadata(API_CONTROLLER_IDENTITY_PLAN_METADATA_KEY, handler) as IApiControllerIdentityPlan | undefined;
}
