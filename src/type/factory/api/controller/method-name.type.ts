import type { CONTROLLER_API_DECORATOR_CONSTANT } from "../../../../constant";
import type { EApiRouteType } from "../../../../enum";
import type { TCapitalizeString } from "../../../utility";

export type TApiControllerMethodName<T extends EApiRouteType> = `${typeof CONTROLLER_API_DECORATOR_CONSTANT.RESERVED_METHOD_PREFIX}${TCapitalizeString<T>}`;
