import type { EApiControllerRequestTarget, EApiRouteType } from "@enum/decorator/api";
import type { IApiControllerPropertiesRouteBaseRequestTarget } from "@interface/decorator/api/controller/properties/route/base/request/target.interface";
import type { TApiControllerAllowedRequestTarget } from "@type/decorator/api/controller";

// eslint-disable-next-line @elsikora/typescript/naming-convention
export type IApiControllerPropertiesRouteBaseRequest<E, R extends EApiRouteType> = {
	[TARGET in EApiControllerRequestTarget as TARGET extends TApiControllerAllowedRequestTarget<R> ? TARGET : never]?: IApiControllerPropertiesRouteBaseRequestTarget<E>;
};
