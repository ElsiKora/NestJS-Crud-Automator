import type { EApiControllerGetListQueryPaginationMode } from "@enum/decorator/api";
import type { IApiControllerGetListQueryRuntimeResult } from "@interface/class/api/controller/get-list/query";

export type TApiControllerGetListCursorQueryRuntimeResult = {
	after?: string;
	before?: string;
	page: undefined;
	paginationMode: EApiControllerGetListQueryPaginationMode.CURSOR;
} & Omit<IApiControllerGetListQueryRuntimeResult, "page">;
