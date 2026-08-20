import type { EApiControllerGetListQueryPaginationMode } from "@enum/decorator/api";
import type { IApiGetListCursorResponseResult, IApiGetListResponseResult } from "@interface/decorator/api";
import type { TApiControllerGetListQuery } from "@type/decorator/api/controller";
import type { DeepPartial } from "typeorm";

export type TApiControllerTransformDataObjectToTransform<E> = {
	body?: DeepPartial<E>;
	parameters?: Partial<E>;
	query?: TApiControllerGetListQuery<E, EApiControllerGetListQueryPaginationMode>;
	response?: IApiGetListCursorResponseResult<E> | IApiGetListResponseResult<E> | Partial<E>;
};
