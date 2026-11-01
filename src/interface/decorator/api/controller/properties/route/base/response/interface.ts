import type { EApiControllerResponseTarget, EApiRouteType } from "@enum/decorator/api";
import type { IApiControllerPropertiesRouteBaseResponseTarget } from "@interface/decorator/api/controller/properties/route/base/response/target.interface";
import type { IApiRouteResponseSerializationProperties } from "@interface/decorator/api/route";
import type { TSwaggerHeadersObject } from "@type/swagger";

export interface IApiControllerPropertiesRouteBaseResponse<E, R extends EApiRouteType> {
	[EApiControllerResponseTarget.RESPONSE]?: R extends EApiRouteType.DELETE ? never : IApiControllerPropertiesRouteBaseResponseTarget<E>;
	headers?: TSwaggerHeadersObject;
	serialization?: IApiRouteResponseSerializationProperties;
}
