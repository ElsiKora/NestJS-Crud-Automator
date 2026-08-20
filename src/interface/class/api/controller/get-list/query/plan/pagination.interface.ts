import type { EApiControllerGetListQueryPaginationMode } from "@enum/decorator/api";

export interface IApiControllerGetListQueryPlanPagination<M extends EApiControllerGetListQueryPaginationMode = EApiControllerGetListQueryPaginationMode.PAGE> {
	mode: M;
}
