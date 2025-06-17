import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { TApiFunctionGetManyProperties } from "@type/decorator/api/function";
import type { EntityManager, Repository } from "typeorm";

export interface IApiFunctionGetManyExecutorProperties<E extends IApiBaseEntity> {
	constructor: new (...args: Array<any>) => any;
	entity: new (...args: Array<any>) => E;
	eventManager?: EntityManager;
	properties: TApiFunctionGetManyProperties<E>;
	repository: Repository<E>;
}
