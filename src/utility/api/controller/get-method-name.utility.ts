import type { EApiRouteType } from "../../../enum";

import { CONTROLLER_API_DECORATOR_CONSTANT } from "../../../constant";

/**
 * Generates a standardized method name for controller methods based on the API route type.
 * Prefixes the method name with a reserved prefix defined in constants.
 * @param {EApiRouteType} method - The API route type (CREATE, DELETE, GET, etc.)
 * @returns {string} The generated method name
 */
export function ApiControllerGetMethodName(method: EApiRouteType): string {
	return `${CONTROLLER_API_DECORATOR_CONSTANT.RESERVED_METHOD_PREFIX}${method}`;
}
