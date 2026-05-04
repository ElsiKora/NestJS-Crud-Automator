import type { IApiControllerPropertiesRouteBaseRelationsRequest } from "./request";
import type { IApiControllerPropertiesRouteBaseRelationsResponse } from "./response";

export interface IApiControllerPropertiesRouteBaseRelations<E> {
	request?: IApiControllerPropertiesRouteBaseRelationsRequest<E>;
	response?: IApiControllerPropertiesRouteBaseRelationsResponse<E>;
}
