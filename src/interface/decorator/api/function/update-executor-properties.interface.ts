import type { ApiFunctionWriteCondition } from "@class/api/function/write-condition.class";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { TApiAuthorizationScopeWhere } from "@type/class/api/authorization/scope-where.type";
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
	/** Conditions the BEFORE subscribers added to the write scope. */
	writeCondition: ApiFunctionWriteCondition<E>;
	/** Scope the read addressed the row through: the criteria and the generated route's scope. */
	writeScope: TApiAuthorizationScopeWhere<E>;
}
