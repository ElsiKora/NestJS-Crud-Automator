import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiGetListResponseResult } from "@interface/decorator/api/get-list-response-result.interface";

export type TApiAuthorizationRuleTransformPayload<E extends IApiBaseEntity> = Array<unknown> | boolean | E | IApiGetListResponseResult<E> | null | number | object | Partial<E> | Record<string, unknown> | string | undefined;
