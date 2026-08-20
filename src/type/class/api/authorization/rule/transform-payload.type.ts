import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiGetListCursorResponseResult, IApiGetListResponseResult } from "@interface/decorator/api";

export type TApiAuthorizationRuleTransformPayload<E extends IApiBaseEntity> = Array<unknown> | boolean | E | IApiGetListCursorResponseResult<E> | IApiGetListResponseResult<E> | null | number | object | Partial<E> | Record<string, unknown> | string | undefined;
