import type { EApiRouteType } from "@enum/decorator/api";
import type { IApiControllerPropertiesRouteBaseGeneration, IApiControllerPropertiesRouteBaseRelations, IApiControllerPropertiesRouteBaseRequest, IApiControllerPropertiesRouteBaseResponse, IApiControllerPropertiesRouteBaseSecurity } from "@interface/decorator/api";

export interface IApiControllerPropertiesRouteBase<E, R extends EApiRouteType> {
	generation?: IApiControllerPropertiesRouteBaseGeneration;
	relations?: IApiControllerPropertiesRouteBaseRelations<E>;
	request?: IApiControllerPropertiesRouteBaseRequest<E, R>;
	response?: IApiControllerPropertiesRouteBaseResponse<E, R>;
	security?: IApiControllerPropertiesRouteBaseSecurity;
}
