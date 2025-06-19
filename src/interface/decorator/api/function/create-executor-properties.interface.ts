import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { TApiFunctionCreateProperties } from "@type/decorator/api/function";
import type { EntityManager, Repository } from "typeorm";

export interface IApiFunctionCreateExecutorProperties<E extends IApiBaseEntity> {
	constructor: new (...arguments_: Array<any>) => any;
	entity: new (...arguments_: Array<any>) => E;
	eventManager?: EntityManager;
	properties: TApiFunctionCreateProperties<E>;
	repository: Repository<E>;
}
