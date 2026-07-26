import type { IApiControllerPropertiesRouteBaseRequestTarget } from "../target.interface";

import type { IApiControllerPropertiesRouteGetListQueryFilter } from "./filter";
import type { IApiControllerPropertiesRouteGetListQueryOrder } from "./order";

export interface IApiControllerPropertiesRouteGetListQueryRequestTarget<E> extends IApiControllerPropertiesRouteBaseRequestTarget<E> {
	filter?: IApiControllerPropertiesRouteGetListQueryFilter<E>;
	order?: IApiControllerPropertiesRouteGetListQueryOrder<E>;
}
