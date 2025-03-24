import type { EntityManager, Repository } from "typeorm";

import type { TApiFunctionGetManyProperties } from "../../../../type";
import type { IApiBaseEntity } from "../../../api-base-entity.interface";

export interface IApiFunctionGetManyExecutorProperties<E extends IApiBaseEntity> {
	entity: IApiBaseEntity;
	eventManager?: EntityManager;
	properties: TApiFunctionGetManyProperties<E>;
	repository: Repository<E>;
}
