import type {IApiGetListResponseResult} from "../../../../../interface";
import {TApiControllerGetListQuery} from "../../../../decorator";

export type TApiTransformDataIsValidationProperties<E> = IApiGetListResponseResult<E> | Partial<E> | TApiControllerGetListQuery<E>;
