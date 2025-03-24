import type { EntityManager, Repository } from "typeorm";

import type { TApiFunctionGetListProperties } from "../../../../type";
import type { IApiBaseEntity } from "../../../api-base-entity.interface";

export interface IApiFunctionGetListExecutorProperties<E extends IApiBaseEntity> {
	entity: IApiBaseEntity;
	eventManager?: EntityManager;
	properties: TApiFunctionGetListProperties<E>;
	repository: Repository<E>;
}
