import type { EApiControllerRequestTarget, EApiRouteType } from "@enum/decorator/api";
import type { TApiControllerAllowedRequestTarget } from "@type/decorator/api/controller";

import type { IApiControllerPropertiesRouteBaseRequestTarget } from "./target.interface";

// eslint-disable-next-line @elsikora/typescript/naming-convention
export type IApiControllerPropertiesRouteBaseRequest<E, R extends EApiRouteType> = {
	[TARGET in EApiControllerRequestTarget as TARGET extends TApiControllerAllowedRequestTarget<R> ? TARGET : never]?: IApiControllerPropertiesRouteBaseRequestTarget<E>;
};
