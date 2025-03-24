import type { EntityManager, FindOptionsWhere, Repository } from "typeorm";

import type { TApiFunctionGetProperties, TApiFunctionUpdateProperties } from "../../../../type";
import type { IApiBaseEntity } from "../../../api-base-entity.interface";

export interface IApiFunctionUpdateExecutorProperties<E extends IApiBaseEntity> {
	criteria: FindOptionsWhere<E>;
	entity: IApiBaseEntity;
	eventManager?: EntityManager;
	getFunction: (properties: TApiFunctionGetProperties<E>, eventManager?: EntityManager) => Promise<E>;
	properties: TApiFunctionUpdateProperties<E>;
	repository: Repository<E>;
}
