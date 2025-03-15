import type { Repository } from "typeorm";

import type { TApiFunctionGetListProperties } from "../../../../type";
import type { IApiBaseEntity } from "../../../api-base-entity.interface";

export interface IApiFunctionGetListExecutorProperties<E extends IApiBaseEntity> {
	entity: IApiBaseEntity;
	properties: TApiFunctionGetListProperties<E>;
	repository: Repository<E>;
}
