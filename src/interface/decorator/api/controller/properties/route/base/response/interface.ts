import type { EApiControllerResponseTarget, EApiRouteType } from "@enum/decorator/api";
import type { IApiRouteResponseSerializationProperties } from "@interface/decorator/api/route";

import type { IApiControllerPropertiesRouteBaseResponseTarget } from "./target.interface";

export interface IApiControllerPropertiesRouteBaseResponse<E, R extends EApiRouteType> {
	[EApiControllerResponseTarget.RESPONSE]?: R extends EApiRouteType.DELETE ? never : IApiControllerPropertiesRouteBaseResponseTarget<E>;
	serialization?: IApiRouteResponseSerializationProperties;
}
