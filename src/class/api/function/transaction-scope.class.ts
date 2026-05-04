import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiFunctionContext } from "@interface/class/api/function";
import type { DataSource, EntityManager, Repository } from "typeorm";

import { ApiFunctionContextStorage } from "@class/api/function/context-storage.class";

export class ApiFunctionTransactionScope {
	public static async runWithDataSource<R>(dataSource: DataSource, callback: () => Promise<R>): Promise<R> {
		return await dataSource.transaction(async (entityManager: EntityManager): Promise<R> => await ApiFunctionTransactionScope.runWithEntityManager(entityManager, callback));
	}

	public static async runWithEntityManager<R>(entityManager: EntityManager, callback: () => Promise<R>): Promise<R> {
		const entity: new () => IApiBaseEntity = Object as unknown as new () => IApiBaseEntity;

		const context: IApiFunctionContext<IApiBaseEntity> = {
			entity,
			eventManager: entityManager,
			getRepository: <T extends IApiBaseEntity>(repositoryEntity: new () => T): Repository<T> => entityManager.getRepository(repositoryEntity),
			operations: {
				create: (): Promise<IApiBaseEntity> => Promise.reject(ApiFunctionTransactionScope.createMissingServiceContextError()),
				delete: (): Promise<void> => Promise.reject(ApiFunctionTransactionScope.createMissingServiceContextError()),
				get: (): Promise<IApiBaseEntity> => Promise.reject(ApiFunctionTransactionScope.createMissingServiceContextError()),
				getList: (): Promise<never> => Promise.reject(ApiFunctionTransactionScope.createMissingServiceContextError()),
				getMany: (): Promise<Array<IApiBaseEntity>> => Promise.reject(ApiFunctionTransactionScope.createMissingServiceContextError()),
				getRepository: <T extends IApiBaseEntity>(repositoryEntity: new () => T): Repository<T> => entityManager.getRepository(repositoryEntity),
				update: (): Promise<IApiBaseEntity> => Promise.reject(ApiFunctionTransactionScope.createMissingServiceContextError()),
			},
			repository: entityManager.getRepository(entity),
		};

		return await ApiFunctionContextStorage.run(context, callback);
	}

	private static createMissingServiceContextError(): Error {
		return new Error("ApiFunctionTransactionScope operations require a decorated service context");
	}
}
