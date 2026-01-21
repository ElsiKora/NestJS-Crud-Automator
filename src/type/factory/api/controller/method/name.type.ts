import type { CONTROLLER_API_DECORATOR_CONSTANT } from "@constant/decorator/api";
import type { EApiRouteType } from "@enum/decorator/api";
import type { TCapitalizeString } from "@type/utility";

export type TApiControllerMethodName<T extends EApiRouteType> = `${typeof CONTROLLER_API_DECORATOR_CONSTANT.RESERVED_METHOD_PREFIX}${TCapitalizeString<T>}`;
