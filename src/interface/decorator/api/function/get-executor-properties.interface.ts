import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { TApiFunctionGetProperties } from "@type/decorator/api/function";
import type { EntityManager, Repository } from "typeorm";

export interface IApiFunctionGetExecutorProperties<E extends IApiBaseEntity> {
	constructor: new (...args: Array<any>) => any;
	entity: new (...args: Array<any>) => E;
	eventManager?: EntityManager;
	properties: TApiFunctionGetProperties<E>;
	repository: Repository<E>;
}
