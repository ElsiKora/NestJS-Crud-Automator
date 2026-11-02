import type { IApiControllerIdentityPlan } from "@interface/class/api/controller/identity-plan.interface";
import type { IApiControllerPathPlan, IApiControllerPathPlanParameter } from "@interface/class/api/controller/path";

import { EApiRouteType } from "@enum/decorator/api";

/**
 * Lists the path parameters of a generated route in path order, with the GET identity alias applied.
 * @param {IApiControllerPathPlan} pathPlan - Compiled controller path plan.
 * @param {EApiRouteType} method - Generated route type.
 * @param {IApiControllerIdentityPlan} [identityPlan] - Compiled GET identity alias.
 * @returns {ReadonlyArray<IApiControllerPathPlanParameter>} Bound parameters, followed by the row parameters on a route that addresses one row.
 */
export function ApiControllerPathRouteParameters(pathPlan: IApiControllerPathPlan, method: EApiRouteType, identityPlan?: IApiControllerIdentityPlan): ReadonlyArray<IApiControllerPathPlanParameter> {
	if (method === EApiRouteType.CREATE || method === EApiRouteType.GET_LIST) {
		return pathPlan.scopeParameters;
	}

	return [...pathPlan.scopeParameters, ...pathPlan.rowParameters.map((mapping: IApiControllerPathPlanParameter): IApiControllerPathPlanParameter => (mapping.field === identityPlan?.field ? { field: mapping.field, parameter: identityPlan.parameter } : mapping))];
}
