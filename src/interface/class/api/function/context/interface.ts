import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiFunctionContextOperations } from "@interface/class/api/function/context/operations.interface";
import type { EntityManager, Repository } from "typeorm";

export interface IApiFunctionContext<E extends IApiBaseEntity> {
	entity: new () => E;
	eventManager?: EntityManager;
	getRepository: <T extends IApiBaseEntity>(entity: new () => T) => Repository<T>;
	operations: IApiFunctionContextOperations<E>;
	repository: Repository<E>;
}
