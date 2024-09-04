import { CONTROLLER_API_DECORATOR_CONSTANT } from "../../../constant";

import { CapitalizeString } from "../../capitalize-string.utility";

import type { EApiRouteType } from "../../../enum";

export function ApiControllerGetMethodName(method: EApiRouteType): string {
	return `${CONTROLLER_API_DECORATOR_CONSTANT.RESERVED_METHOD_PREFIX}${CapitalizeString(method)}`;
}
