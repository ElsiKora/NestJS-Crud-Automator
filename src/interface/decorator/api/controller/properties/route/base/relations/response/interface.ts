import type { IApiControllerPropertiesRouteBaseRelationsReference } from "../reference.interface";

import type { IApiControllerPropertiesRouteBaseRelationsResponseLoad } from "./load.interface";

export interface IApiControllerPropertiesRouteBaseRelationsResponse<E> {
	load?: IApiControllerPropertiesRouteBaseRelationsResponseLoad<E>;
	reference: IApiControllerPropertiesRouteBaseRelationsReference;
}
