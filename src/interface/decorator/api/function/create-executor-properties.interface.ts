import type { EntityManager, Repository } from "typeorm";

import type { TApiFunctionCreateProperties } from "../../../../type";
import type { IApiBaseEntity } from "../../../api-base-entity.interface";

export interface IApiFunctionCreateExecutorProperties<E extends IApiBaseEntity> {
	entity: IApiBaseEntity;
	eventManager?: EntityManager;
	properties: TApiFunctionCreateProperties<E>;
	repository: Repository<E>;
}
