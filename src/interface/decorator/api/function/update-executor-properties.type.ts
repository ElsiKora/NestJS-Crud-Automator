import type { FindOptionsWhere, Repository } from "typeorm";

import type { TApiFunctionGetProperties, TApiFunctionUpdateProperties } from "../../../../type";
import type { IApiBaseEntity } from "../../../api-base-entity.interface";

export interface IApiFunctionUpdateExecutorProperties<E extends IApiBaseEntity> {
	criteria: FindOptionsWhere<E>;
	entity: IApiBaseEntity;
	getFunction: (properties: TApiFunctionGetProperties<E>) => Promise<E>;
	properties: TApiFunctionUpdateProperties<E>;
	repository: Repository<E>;
}
