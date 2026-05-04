import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { EntityManager, Repository } from "typeorm";

import type { IApiFunctionContextOperations } from "./operations.interface";

export interface IApiFunctionContext<E extends IApiBaseEntity> {
	entity: new () => E;
	eventManager?: EntityManager;
	getRepository: <T extends IApiBaseEntity>(entity: new () => T) => Repository<T>;
	operations: IApiFunctionContextOperations<E>;
	repository: Repository<E>;
}
