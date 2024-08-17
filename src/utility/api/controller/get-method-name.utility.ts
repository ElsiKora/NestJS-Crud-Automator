import { API_CONTROLLER_DECORATOR_CONSTANT } from "../../../constant";

import { CapitalizeString } from "../../capitalize-string.utility";
import {EApiRouteType} from "../../../enum";


export function ApiControllerGetMethodName(method: EApiRouteType): string {
	return `${API_CONTROLLER_DECORATOR_CONSTANT.RESERVED_METHOD_PREFIX}${CapitalizeString(method)}`;
}
