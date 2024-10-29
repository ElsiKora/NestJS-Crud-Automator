import type { TApiFunctionGetProperties } from "../../../../type";
import type { IApiBaseEntity } from "../../../api-base-entity.interface";
import type { Repository } from "typeorm";

export interface IApiFunctionGetExecutorProperties<E extends IApiBaseEntity> {
	entity: IApiBaseEntity;
	properties: TApiFunctionGetProperties<E>;
	repository: Repository<E>;
}
