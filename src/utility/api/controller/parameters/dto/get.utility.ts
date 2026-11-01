import type { IApiControllerParametersRule } from "@interface/class/api/controller";

import { API_CONTROLLER_PARAMETERS_DTO_METADATA_KEY } from "./metadata-key.constant";

/**
 * Returns the path value rule attached to a controller handler.
 * @param {object} handler - Exact controller handler function.
 * @returns {IApiControllerParametersRule | undefined} PARAMETERS DTOs of the route, when the route has a rule.
 */
export function ApiControllerParametersDtoGet(handler: object): IApiControllerParametersRule | undefined {
	return Reflect.getMetadata(API_CONTROLLER_PARAMETERS_DTO_METADATA_KEY, handler) as IApiControllerParametersRule | undefined;
}
