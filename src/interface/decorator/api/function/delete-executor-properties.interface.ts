import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { TApiFunctionDeleteCriteria, TApiFunctionGetProperties } from "@type/decorator/api/function";
import type { EntityManager, Repository } from "typeorm";

export interface IApiFunctionDeleteExecutorProperties<E extends IApiBaseEntity> {
	constructor: new (...args: Array<any>) => any;
	criteria: TApiFunctionDeleteCriteria<E>;
	entity: new (...args: Array<any>) => E;
	eventManager?: EntityManager;
	getFunction: (properties: TApiFunctionGetProperties<E>, eventManager?: EntityManager) => Promise<E>;
	repository: Repository<E>;
}
