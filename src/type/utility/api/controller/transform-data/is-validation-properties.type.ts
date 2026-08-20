import type { EApiControllerGetListQueryPaginationMode } from "@enum/decorator/api";
import type { IApiGetListCursorResponseResult, IApiGetListResponseResult } from "@interface/decorator/api";
import type { TApiControllerGetListQuery } from "@type/decorator/api/controller";

export type TApiTransformDataIsValidationProperties<E> = IApiGetListCursorResponseResult<E> | IApiGetListResponseResult<E> | Partial<E> | TApiControllerGetListQuery<E, EApiControllerGetListQueryPaginationMode>;
