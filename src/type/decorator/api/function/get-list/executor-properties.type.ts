import type { TApiFunctionGetListProperties } from "./properties.type";
import type { IApiBaseEntity } from "../../../../../interface";

import type { FindManyOptions, Repository } from "typeorm";

export interface IApiFunctionGetListExecutorProperties<E extends IApiBaseEntity> {
	entity: IApiBaseEntity;
	filter: FindManyOptions<E>;
	properties: TApiFunctionGetListProperties<E>;
	repository: Repository<E>;
}
