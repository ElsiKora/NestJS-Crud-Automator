import type { CONTROLLER_API_DECORATOR_CONSTANT } from "@constant/decorator/api";
import type { EApiRouteType } from "@enum/decorator/api";

export type TApiControllerMethodNameMap = {
	[K in EApiRouteType]: `${typeof CONTROLLER_API_DECORATOR_CONSTANT.RESERVED_METHOD_PREFIX}${Capitalize<K>}`;
};
