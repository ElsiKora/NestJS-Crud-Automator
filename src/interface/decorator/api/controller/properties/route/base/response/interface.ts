import type { EApiControllerResponseTarget, EApiRouteType } from "@enum/decorator/api";
import type { IApiRouteResponseSerializationProperties } from "@interface/decorator/api/route";
import type { HeadersObject } from "@nestjs/swagger/dist/interfaces/open-api-spec.interface";

import type { IApiControllerPropertiesRouteBaseResponseTarget } from "./target.interface";

export interface IApiControllerPropertiesRouteBaseResponse<E, R extends EApiRouteType> {
	[EApiControllerResponseTarget.RESPONSE]?: R extends EApiRouteType.DELETE ? never : IApiControllerPropertiesRouteBaseResponseTarget<E>;
	headers?: HeadersObject;
	serialization?: IApiRouteResponseSerializationProperties;
}
