import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiControllerPathPlan } from "@interface/class/api/controller/path";
import type { IApiControllerProperties } from "@interface/decorator/api";

import { ErrorException } from "@utility/error/exception.utility";

/**
 * Prevents low-level controller facades from silently ignoring declared path settings.
 * @template E - Entity type owned by the controller.
 * @param {IApiControllerProperties<E>} properties - Controller configuration supplied to the facade.
 * @param {IApiControllerPathPlan} [pathPlan] - Factory-compiled path plan.
 * @returns {void}
 */
export function ApiControllerPathPlanAssert<E extends IApiBaseEntity>(properties: IApiControllerProperties<E>, pathPlan?: IApiControllerPathPlan): void {
	if ((properties.pathScope !== undefined || properties.rowPath !== undefined) && !pathPlan) {
		throw ErrorException("Controller pathScope and rowPath require compilation by the @ApiController factory");
	}
}
