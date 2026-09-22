import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { TApiFunctionGetProperties, TApiFunctionUpdateCriteria, TApiFunctionUpdateProperties } from "@type/decorator/api/function";
import type { Repository } from "typeorm";

export interface IApiFunctionUpdateExecutorProperties<E extends IApiBaseEntity> {
	constructor: new (...arguments_: Array<unknown>) => unknown;
	criteria: TApiFunctionUpdateCriteria<E>;
	entity: new (...arguments_: Array<unknown>) => E;
	existingEntity: E;
	patch?: {
		identity: TApiFunctionUpdateCriteria<E>;
		readProperties: TApiFunctionGetProperties<E>;
		selectedColumns: ReadonlySet<string>;
	};
	properties: TApiFunctionUpdateProperties<E>;
	repository: Repository<E>;
}
