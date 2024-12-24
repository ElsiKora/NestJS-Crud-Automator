import type { Repository } from "typeorm";

import type { TApiFunctionCreateProperties } from "../../../../type";
import type { IApiBaseEntity } from "../../../api-base-entity.interface";

export interface IApiFunctionCreateExecutorProperties<E extends IApiBaseEntity> {
	entity: IApiBaseEntity;
	properties: TApiFunctionCreateProperties<E>;
	repository: Repository<E>;
}
