import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { TApiFunctionDeleteCriteria, TApiFunctionGetProperties } from "@type/decorator/api/function";
import type { EntityManager, Repository } from "typeorm";

export interface IApiFunctionDeleteExecutorProperties<E extends IApiBaseEntity> {
	constructor: new (...arguments_: Array<unknown>) => unknown;
	criteria: TApiFunctionDeleteCriteria<E>;
	entity: new (...arguments_: Array<unknown>) => E;
	eventManager?: EntityManager;
	getFunction: (properties: TApiFunctionGetProperties<E>, eventManager?: EntityManager) => Promise<E>;
	repository: Repository<E>;
}
