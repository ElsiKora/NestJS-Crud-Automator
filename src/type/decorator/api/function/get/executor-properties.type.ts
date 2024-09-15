import type { IApiBaseEntity } from "../../../../../interface";
import type { FindOneOptions, Repository } from "typeorm";

export interface IApiFunctionGetExecutorProperties<E extends IApiBaseEntity> {
	entity: IApiBaseEntity;
	filter: FindOneOptions<E>;
	repository: Repository<E>;
}
