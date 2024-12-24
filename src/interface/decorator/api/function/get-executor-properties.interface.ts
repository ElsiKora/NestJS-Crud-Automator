import type { Repository } from "typeorm";

import type { TApiFunctionGetProperties } from "../../../../type";
import type { IApiBaseEntity } from "../../../api-base-entity.interface";

export interface IApiFunctionGetExecutorProperties<E extends IApiBaseEntity> {
	entity: IApiBaseEntity;
	properties: TApiFunctionGetProperties<E>;
	repository: Repository<E>;
}
