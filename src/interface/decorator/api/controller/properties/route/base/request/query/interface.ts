import type { EApiControllerGetListQueryPaginationMode } from "@enum/decorator/api";

import type { IApiControllerPropertiesRouteBaseRequestTarget } from "../target.interface";

import type { IApiControllerPropertiesRouteGetListQueryFilter } from "./filter";
import type { IApiControllerPropertiesRouteGetListQueryOrder } from "./order";
import type { IApiControllerPropertiesRouteGetListQueryPagination } from "./pagination.interface";

export interface IApiControllerPropertiesRouteGetListQueryRequestTarget<E, M extends EApiControllerGetListQueryPaginationMode = EApiControllerGetListQueryPaginationMode.PAGE> extends IApiControllerPropertiesRouteBaseRequestTarget<E, M> {
	filter?: IApiControllerPropertiesRouteGetListQueryFilter<E>;
	order?: IApiControllerPropertiesRouteGetListQueryOrder<E>;
	pagination?: IApiControllerPropertiesRouteGetListQueryPagination<M>;
}
