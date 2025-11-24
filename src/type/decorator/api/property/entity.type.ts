import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { Type } from "@nestjs/common";

export type TApiPropertyEntity<E extends IApiBaseEntity = IApiBaseEntity> = (() => IApiBaseEntity | Type<E> | undefined) | IApiBaseEntity | Type<E>;
