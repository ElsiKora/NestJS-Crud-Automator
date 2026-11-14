import type { ApiFunctionWriteCondition } from "@class/api/function/write-condition.class";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { TApiFunctionDeleteCriteria, TApiFunctionGetProperties } from "@type/decorator/api/function";
import type { Repository } from "typeorm";

export interface IApiFunctionDeleteExecutorProperties<E extends IApiBaseEntity> {
	constructor: new (...arguments_: Array<unknown>) => unknown;
	criteria: TApiFunctionDeleteCriteria<E>;
	entity: new (...arguments_: Array<unknown>) => E;
	getFunction: (properties: TApiFunctionGetProperties<E>) => Promise<E>;
	repository: Repository<E>;
	/** Conditions the BEFORE subscribers added to the write scope. */
	writeCondition: ApiFunctionWriteCondition<E>;
}
