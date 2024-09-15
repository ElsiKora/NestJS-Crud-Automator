import type { TApiFunctionUpdateProperties } from "./properties.type";
import type { IApiBaseEntity } from "../../../../../interface";

import type { TApiFunctionGetProperties } from "../get";
import type { Repository } from "typeorm";

export interface IApiFunctionUpdateExecutorProperties<E extends IApiBaseEntity> {
	entity: IApiBaseEntity;
	getFunction: (id: string, properties?: TApiFunctionGetProperties<E>) => Promise<E>;
	id: number | string;
	properties: TApiFunctionUpdateProperties<E>;
	repository: Repository<E>;
}
