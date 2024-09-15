import type { IApiBaseEntity } from "../../../../../interface";

import type { TApiFunctionGetProperties } from "../get";
import type { Repository } from "typeorm";

export interface IApiFunctionDeleteExecutorProperties<E extends IApiBaseEntity> {
	entity: IApiBaseEntity;
	getFunction: (id: string, properties?: TApiFunctionGetProperties<E>) => Promise<E>;
	id: number | string;
	repository: Repository<E>;
}
