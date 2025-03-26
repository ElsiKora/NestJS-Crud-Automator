import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { TApiFunctionGetManyProperties } from "@type/decorator/api/function";
import type { EntityManager, Repository } from "typeorm";

export interface IApiFunctionGetManyExecutorProperties<E extends IApiBaseEntity> {
	entity: IApiBaseEntity;
	eventManager?: EntityManager;
	properties: TApiFunctionGetManyProperties<E>;
	repository: Repository<E>;
}
