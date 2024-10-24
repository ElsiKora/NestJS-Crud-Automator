import {EApiRouteType} from "../../../../enum";
import {CONTROLLER_API_DECORATOR_CONSTANT} from "../../../../constant";
import {TCapitalizeString} from "../../../utility";

export type TApiControllerMethodName<T extends EApiRouteType> = `${typeof CONTROLLER_API_DECORATOR_CONSTANT.RESERVED_METHOD_PREFIX}${TCapitalizeString<T>}`;
