import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { TApiFunctionGetProperties, TApiFunctionUpdateCriteria, TApiFunctionUpdateProperties } from "@type/decorator/api/function";
import type { EntityManager, Repository } from "typeorm";

export interface IApiFunctionUpdateExecutorProperties<E extends IApiBaseEntity> {
	constructor: new (...arguments_: Array<any>) => any;
	criteria: TApiFunctionUpdateCriteria<E>;
	entity: new (...arguments_: Array<any>) => E;
	eventManager?: EntityManager;
	getFunction: (properties: TApiFunctionGetProperties<E>, eventManager?: EntityManager) => Promise<E>;
	properties: TApiFunctionUpdateProperties<E>;
	repository: Repository<E>;
}
