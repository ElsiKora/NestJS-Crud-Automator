import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { Type } from "@nestjs/common";
import type { TApiEntityReference } from "@type/api-entity-reference.type";

export type TApiPropertyEntity<E extends IApiBaseEntity = IApiBaseEntity> = (() => TApiEntityReference | Type<E> | undefined) | TApiEntityReference | Type<E>;
