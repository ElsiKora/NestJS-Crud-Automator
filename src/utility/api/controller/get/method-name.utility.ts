import type { EApiRouteType } from "@enum/decorator/api";
import type { TApiControllerMethodName } from "@type/factory/api/controller/method/name.type";

import { CONTROLLER_API_DECORATOR_CONSTANT } from "@constant/decorator/api";

/**
 * Generates a standardized method name for controller methods based on the API route type.
 * Prefixes the method name with a reserved prefix defined in constants.
 * @template T - Route type.
 * @param {EApiRouteType} method - The API route type (CREATE, DELETE, GET, etc.)
 * @returns {TApiControllerMethodName<T>} The generated method name
 */
export function ApiControllerGetMethodName<T extends EApiRouteType>(method: T): TApiControllerMethodName<T> {
	return `${CONTROLLER_API_DECORATOR_CONSTANT.RESERVED_METHOD_PREFIX}${method}`;
}
