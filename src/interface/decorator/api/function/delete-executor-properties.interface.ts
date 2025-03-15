import type { FindOptionsWhere, Repository } from "typeorm";

import type { TApiFunctionGetProperties } from "../../../../type";
import type { IApiBaseEntity } from "../../../api-base-entity.interface";

export interface IApiFunctionDeleteExecutorProperties<E extends IApiBaseEntity> {
	criteria: FindOptionsWhere<E>;
	entity: IApiBaseEntity;
	getFunction: (properties: TApiFunctionGetProperties<E>) => Promise<E>;
	repository: Repository<E>;
}
