import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { FindOptionsWhere } from "typeorm";

export type TApiAuthorizationScopeWhere<E extends IApiBaseEntity> = Array<FindOptionsWhere<E>> | FindOptionsWhere<E> | undefined;
