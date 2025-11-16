import type { IApiBaseEntity } from "@interface/api-base-entity.interface";

export type TApiAuthorizationRuleTransformPayload<E extends IApiBaseEntity> = Array<unknown> | boolean | E | null | number | object | Partial<E> | Record<string, unknown> | string | undefined;
