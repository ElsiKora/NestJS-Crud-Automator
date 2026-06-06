import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { EntityManager, Repository } from "typeorm";

export interface IApiFunctionStepContext<E extends IApiBaseEntity> {
	eventManager?: EntityManager;
	getRepository: <T extends IApiBaseEntity>(entity: new () => T) => Repository<T>;
	repository: Repository<E>;
}
