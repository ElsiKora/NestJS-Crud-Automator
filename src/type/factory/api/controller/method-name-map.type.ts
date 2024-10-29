import type { CONTROLLER_API_DECORATOR_CONSTANT } from "../../../../constant";
import type { EApiRouteType } from "../../../../enum";

export type TApiControllerMethodNameMap = {
	[K in EApiRouteType]: `${typeof CONTROLLER_API_DECORATOR_CONSTANT.RESERVED_METHOD_PREFIX}${Capitalize<K>}`;
};
