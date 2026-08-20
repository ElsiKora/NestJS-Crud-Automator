import type { EApiControllerGetListQueryPaginationMode } from "@enum/decorator/api";

export interface IApiControllerPropertiesRouteGetListQueryPagination<M extends EApiControllerGetListQueryPaginationMode = EApiControllerGetListQueryPaginationMode.PAGE> {
	mode: M;
}
