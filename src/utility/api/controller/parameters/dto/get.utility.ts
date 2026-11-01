import type { Type } from "@nestjs/common";

import { API_CONTROLLER_PARAMETERS_DTO_METADATA_KEY } from "./metadata-key.constant";

/**
 * Returns the PARAMETERS DTO attached to a generated controller handler.
 * @param {object} handler - Exact generated handler function.
 * @returns {Type<unknown> | undefined} PARAMETERS DTO of the route, when the route has one.
 */
export function ApiControllerParametersDtoGet(handler: object): Type<unknown> | undefined {
	return Reflect.getMetadata(API_CONTROLLER_PARAMETERS_DTO_METADATA_KEY, handler) as Type<unknown> | undefined;
}
