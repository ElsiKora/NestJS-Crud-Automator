import type { IApiControllerIdentityPlan } from "@interface/class/api/controller/identity-plan.interface";
import type { IApiControllerPathPlan, IApiControllerPathPlanParameter } from "@interface/class/api/controller/path";

/**
 * Lists the path parameters that address a row on a generated route, with the GET identity alias applied.
 * @param {IApiControllerPathPlan} pathPlan - Compiled controller path plan.
 * @param {IApiControllerIdentityPlan} [identityPlan] - Compiled GET identity alias.
 * @returns {ReadonlyArray<IApiControllerPathPlanParameter>} Row parameters in path order.
 */
export function ApiControllerPathRowParameters(pathPlan: IApiControllerPathPlan, identityPlan?: IApiControllerIdentityPlan): ReadonlyArray<IApiControllerPathPlanParameter> {
	if (!identityPlan) {
		return pathPlan.rowParameters;
	}

	return pathPlan.rowParameters.map((mapping: IApiControllerPathPlanParameter): IApiControllerPathPlanParameter => (mapping.field === identityPlan.field ? { field: mapping.field, parameter: identityPlan.parameter } : mapping));
}
