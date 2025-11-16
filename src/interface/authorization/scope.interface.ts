import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { FindOptionsWhere } from "typeorm";

export interface IApiAuthorizationScope<E extends IApiBaseEntity> {
	where?: Array<FindOptionsWhere<E>> | FindOptionsWhere<E>;
}
