import type { IApiGetListResponseResult } from "@interface/decorator/api";
import type { TApiControllerGetListQuery } from "@type/decorator/api/controller";

export type TApiTransformDataIsValidationProperties<E> = IApiGetListResponseResult<E> | Partial<E> | TApiControllerGetListQuery<E>;
