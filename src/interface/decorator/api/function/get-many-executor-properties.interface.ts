import type { Repository } from "typeorm";

import type { TApiFunctionGetManyProperties } from "../../../../type";
import type { IApiBaseEntity } from "../../../api-base-entity.interface";

export interface IApiFunctionGetManyExecutorProperties<E extends IApiBaseEntity> {
	entity: IApiBaseEntity;
	properties: TApiFunctionGetManyProperties<E>;
	repository: Repository<E>;
}
