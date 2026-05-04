import type { IApiControllerPropertiesRouteBaseRelationsReference } from "../reference.interface";

import type { IApiControllerPropertiesRouteBaseRelationsRequestLoad } from "./load.interface";

export interface IApiControllerPropertiesRouteBaseRelationsRequest<E> {
	load?: IApiControllerPropertiesRouteBaseRelationsRequestLoad<E>;
	reference: IApiControllerPropertiesRouteBaseRelationsReference;
}
