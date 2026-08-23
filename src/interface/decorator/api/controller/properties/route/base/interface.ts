import type { EApiRouteType } from "@enum/decorator/api";
import type { IApiControllerPropertiesRouteBaseGeneration, IApiControllerPropertiesRouteBaseRelations, IApiControllerPropertiesRouteBaseRequest, IApiControllerPropertiesRouteBaseResponse, IApiControllerPropertiesRouteBaseSecurity, IApiControllerPropertiesRouteBaseTransaction, IApiRouteExecutionProperties } from "@interface/decorator/api";
import type { IApiRouteDocumentationProperties } from "@interface/decorator/api/route/documentation-properties.interface";

export interface IApiControllerPropertiesRouteBase<E, R extends EApiRouteType> {
	documentation?: IApiRouteDocumentationProperties;
	execution?: IApiRouteExecutionProperties;
	generation?: IApiControllerPropertiesRouteBaseGeneration;
	relations?: IApiControllerPropertiesRouteBaseRelations<E>;
	request?: IApiControllerPropertiesRouteBaseRequest<E, R>;
	response?: IApiControllerPropertiesRouteBaseResponse<E, R>;
	security?: IApiControllerPropertiesRouteBaseSecurity;
	transaction?: IApiControllerPropertiesRouteBaseTransaction;
}
