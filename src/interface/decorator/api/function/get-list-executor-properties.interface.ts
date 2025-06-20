import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { TApiFunctionGetListProperties } from "@type/decorator/api/function";
import type { EntityManager, Repository } from "typeorm";

export interface IApiFunctionGetListExecutorProperties<E extends IApiBaseEntity> {
	constructor: new (...arguments_: Array<unknown>) => unknown;
	entity: new (...arguments_: Array<unknown>) => E;
	eventManager?: EntityManager;
	properties: TApiFunctionGetListProperties<E>;
	repository: Repository<E>;
}
