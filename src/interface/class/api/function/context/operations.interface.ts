import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiGetListResponseResult } from "@interface/decorator/api";
import type { TApiFunctionCreateProperties, TApiFunctionDeleteCriteria, TApiFunctionGetListProperties, TApiFunctionGetManyProperties, TApiFunctionGetProperties, TApiFunctionUpdateCriteria, TApiFunctionUpdateProperties } from "@type/decorator/api/function";
import type { Repository } from "typeorm";

export interface IApiFunctionContextOperations<E extends IApiBaseEntity> {
	create: (properties: TApiFunctionCreateProperties<E>) => Promise<E>;
	delete: (criteria: Array<TApiFunctionDeleteCriteria<E>> | TApiFunctionDeleteCriteria<E>) => Promise<void>;
	get: (properties: TApiFunctionGetProperties<E>) => Promise<E>;
	getList: (properties: TApiFunctionGetListProperties<E>) => Promise<IApiGetListResponseResult<E>>;
	getMany: (properties: TApiFunctionGetManyProperties<E>) => Promise<Array<E>>;
	getRepository: <T extends IApiBaseEntity>(entity: new () => T) => Repository<T>;
	update: (criteria: Array<TApiFunctionUpdateCriteria<E>> | TApiFunctionUpdateCriteria<E>, properties: TApiFunctionUpdateProperties<E>) => Promise<E>;
}
