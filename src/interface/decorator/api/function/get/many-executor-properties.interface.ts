import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { TApiFunctionGetManyProperties } from "@type/decorator/api/function";
import type { EntityManager, Repository } from "typeorm";

export interface IApiFunctionGetManyExecutorProperties<E extends IApiBaseEntity> {
	constructor: new (...arguments_: Array<unknown>) => unknown;
	entity: new (...arguments_: Array<unknown>) => E;
	eventManager?: EntityManager;
	properties: TApiFunctionGetManyProperties<E>;
	repository: Repository<E>;
}
