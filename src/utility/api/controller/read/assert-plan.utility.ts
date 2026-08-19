import type { IApiControllerReadPlan } from "@interface/class/api/controller/read";

import { ErrorException } from "@utility/error/exception.utility";

/**
 * Prevents low-level controller facades from silently ignoring an uncompiled read scope.
 * @param {object} routeConfig - Route configuration supplied to the facade.
 * @param {IApiControllerReadPlan} [readPlan] - Factory-compiled read plan.
 * @returns {void}
 */
export function ApiControllerReadPlanAssert(routeConfig: object, readPlan?: IApiControllerReadPlan): void {
	if (Reflect.has(routeConfig, "read") && !readPlan) {
		throw ErrorException("Generated read configuration requires compilation by the @ApiController factory");
	}
}
