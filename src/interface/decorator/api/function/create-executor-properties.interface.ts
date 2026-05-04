import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { TApiFunctionCreateProperties } from "@type/decorator/api/function";
import type { Repository } from "typeorm";

export interface IApiFunctionCreateExecutorProperties<E extends IApiBaseEntity> {
	constructor: new (...arguments_: Array<unknown>) => unknown;
	entity: new (...arguments_: Array<unknown>) => E;
	properties: TApiFunctionCreateProperties<E>;
	repository: Repository<E>;
}
