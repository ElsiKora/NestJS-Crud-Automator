import {EApiRouteType} from "../../../../enum";
import {CONTROLLER_API_DECORATOR_CONSTANT} from "../../../../constant";

export type TApiControllerMethodNameMap = {
    [K in EApiRouteType]: `${typeof CONTROLLER_API_DECORATOR_CONSTANT.RESERVED_METHOD_PREFIX}${Capitalize<K>}`;
};
