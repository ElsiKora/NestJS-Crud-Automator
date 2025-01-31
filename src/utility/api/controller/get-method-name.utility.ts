import type { EApiRouteType } from "../../../enum";

import { CONTROLLER_API_DECORATOR_CONSTANT } from "../../../constant";

export function ApiControllerGetMethodName(method: EApiRouteType): string {
	return `${CONTROLLER_API_DECORATOR_CONSTANT.RESERVED_METHOD_PREFIX}${method}`;
}
