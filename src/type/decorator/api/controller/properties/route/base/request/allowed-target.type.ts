import type { EApiControllerRequestTarget, EApiRouteType } from "@enum/decorator/api";

export type TApiControllerAllowedRequestTarget<R extends EApiRouteType> = {
	[EApiRouteType.CREATE]: EApiControllerRequestTarget.BODY | EApiControllerRequestTarget.PARAMETERS;
	[EApiRouteType.DELETE]: EApiControllerRequestTarget.PARAMETERS;
	[EApiRouteType.GET_LIST]: EApiControllerRequestTarget.PARAMETERS | EApiControllerRequestTarget.QUERY;
	[EApiRouteType.GET]: EApiControllerRequestTarget.PARAMETERS;
	[EApiRouteType.PARTIAL_UPDATE]: EApiControllerRequestTarget.BODY | EApiControllerRequestTarget.PARAMETERS;
	[EApiRouteType.UPDATE]: EApiControllerRequestTarget.BODY | EApiControllerRequestTarget.PARAMETERS;
}[R];
