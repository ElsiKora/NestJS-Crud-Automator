import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { TApiFunctionGetProperties, TApiFunctionUpdateProperties } from "@type/decorator/api/function";
import type { EntityManager, FindOptionsWhere, Repository } from "typeorm";

export interface IApiFunctionUpdateExecutorProperties<E extends IApiBaseEntity> {
	criteria: FindOptionsWhere<E>;
	entity: IApiBaseEntity;
	eventManager?: EntityManager;
	getFunction: (properties: TApiFunctionGetProperties<E>, eventManager?: EntityManager) => Promise<E>;
	properties: TApiFunctionUpdateProperties<E>;
	repository: Repository<E>;
}
