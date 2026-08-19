import type { IApiControllerIdentityPlan } from "@interface/class/api/controller/identity-plan.interface";

import { ErrorException } from "@utility/error/exception.utility";

/**
 * Prevents low-level controller facades from silently ignoring an uncompiled identity alias.
 * @param {object} routeConfig - Route configuration supplied to the facade.
 * @param {IApiControllerIdentityPlan} [identityPlan] - Factory-compiled identity plan.
 * @returns {void}
 */
export function ApiControllerIdentityPlanAssert(routeConfig: object, identityPlan?: IApiControllerIdentityPlan): void {
	if (Reflect.has(routeConfig, "identity") && !identityPlan) {
		throw ErrorException("Generated identity configuration requires compilation by the @ApiController factory");
	}
}
