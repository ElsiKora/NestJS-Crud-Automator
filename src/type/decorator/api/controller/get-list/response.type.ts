import type { EApiControllerGetListQueryPaginationMode } from "@enum/decorator/api";
import type { IApiGetListCursorResponseResult, IApiGetListResponseResult } from "@interface/decorator/api";

export type TApiControllerGetListResponse<T, M extends EApiControllerGetListQueryPaginationMode = EApiControllerGetListQueryPaginationMode.PAGE> = M extends EApiControllerGetListQueryPaginationMode.CURSOR ? IApiGetListCursorResponseResult<T> : IApiGetListResponseResult<T>;
