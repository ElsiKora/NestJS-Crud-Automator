import type { IApiBaseEntity } from "../../../../interface";

import type { TApiFunctionCreateProperties } from "../../../../type";
import type { Repository } from "typeorm";

export interface IApiFunctionCreateExecutorProperties<E extends IApiBaseEntity> {
	entity: IApiBaseEntity;
	properties: TApiFunctionCreateProperties<E>;
	repository: Repository<E>;
}
