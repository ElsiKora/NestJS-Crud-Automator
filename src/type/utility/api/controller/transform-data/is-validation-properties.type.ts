import type { IApiGetListResponseResult } from "../../../../../interface";
import type { TApiControllerGetListQuery } from "../../../../decorator";

export type TApiTransformDataIsValidationProperties<E> = IApiGetListResponseResult<E> | Partial<E> | TApiControllerGetListQuery<E>;
