import type { IApiControllerParametersRule } from "@interface/class/api/controller";

import { API_CONTROLLER_PARAMETERS_DTO_METADATA_KEY } from "./metadata-key.constant";

/**
 * Stores the path value rule of a route on its handler, so the authorization guard and the route runtime apply the same rule.
 * @param {object} handler - Exact controller handler function.
 * @param {IApiControllerParametersRule} rule - DTO built from the described column types, and the configured PARAMETERS DTO that may narrow it.
 * @returns {void}
 */
export function ApiControllerParametersDtoSet(handler: object, rule: IApiControllerParametersRule): void {
	Reflect.defineMetadata(API_CONTROLLER_PARAMETERS_DTO_METADATA_KEY, rule, handler);
}
