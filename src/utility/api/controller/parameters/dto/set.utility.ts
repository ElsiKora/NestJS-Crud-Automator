import type { Type } from "@nestjs/common";

import { API_CONTROLLER_PARAMETERS_DTO_METADATA_KEY } from "./metadata-key.constant";

/**
 * Stores the PARAMETERS DTO of a generated route on its handler, so the authorization guard and the route runtime read the same DTO.
 * @param {object} handler - Exact generated handler function.
 * @param {Type<unknown>} dto - Generated or configured PARAMETERS DTO of the route.
 * @returns {void}
 */
export function ApiControllerParametersDtoSet(handler: object, dto: Type<unknown>): void {
	Reflect.defineMetadata(API_CONTROLLER_PARAMETERS_DTO_METADATA_KEY, dto, handler);
}
