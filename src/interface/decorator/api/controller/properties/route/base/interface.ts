import type { EApiRouteType } from "@enum/decorator/api";
import type { IApiControllerPropertiesRouteBaseGeneration, IApiControllerPropertiesRouteBaseRelations, IApiControllerPropertiesRouteBaseRequest, IApiControllerPropertiesRouteBaseResponse, IApiControllerPropertiesRouteBaseSecurity } from "@interface/decorator/api";
import type { IApiRouteDocumentationProperties } from "@interface/decorator/api/route/documentation-properties.interface";

export interface IApiControllerPropertiesRouteBase<E, R extends EApiRouteType> {
	documentation?: IApiRouteDocumentationProperties;
	generation?: IApiControllerPropertiesRouteBaseGeneration;
	relations?: IApiControllerPropertiesRouteBaseRelations<E>;
	request?: IApiControllerPropertiesRouteBaseRequest<E, R>;
	response?: IApiControllerPropertiesRouteBaseResponse<E, R>;
	security?: IApiControllerPropertiesRouteBaseSecurity;
}
