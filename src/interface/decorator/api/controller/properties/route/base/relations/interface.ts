import type { IApiControllerPropertiesRouteBaseRelationsRequest } from "@interface/decorator/api/controller/properties/route/base/relations/request";
import type { IApiControllerPropertiesRouteBaseRelationsResponse } from "@interface/decorator/api/controller/properties/route/base/relations/response";

export interface IApiControllerPropertiesRouteBaseRelations<E> {
	request?: IApiControllerPropertiesRouteBaseRelationsRequest<E>;
	response?: IApiControllerPropertiesRouteBaseRelationsResponse<E>;
}
