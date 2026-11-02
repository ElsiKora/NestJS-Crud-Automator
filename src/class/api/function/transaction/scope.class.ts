import type { ApiFunctionTransactionRegistry } from "@class/api/function/transaction/registry.class";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiFunctionContext, IApiFunctionTransactionObservationOptions } from "@interface/class/api/function";
import type { DataSource, EntityManager, Repository } from "typeorm";

import { ApiFunctionContextStorage } from "@class/api/function/context-storage.class";
import { ApiFunctionTransactionRuntime } from "@class/api/function/transaction/runtime.class";
import { EApiFunctionTransactionOwnerKind } from "@enum/decorator/api";
import { ErrorException } from "@utility/error/exception.utility";

export class ApiFunctionTransactionScope {
	public static async runWithDataSource<R>(dataSource: DataSource, properties: { name: string; observation?: Readonly<IApiFunctionTransactionObservationOptions> }, callback: (entityManager: EntityManager) => Promise<R>): Promise<R> {
		const name: string = properties.name.trim();

		if (name.length === 0) {
			throw ErrorException("ApiFunctionTransactionScope name must be a non-empty string");
		}

		if (ApiFunctionContextStorage.shouldRunOnDataSource((): DataSource => dataSource)) {
			return await ApiFunctionContextStorage.runOnDataSource(dataSource, async (): Promise<R> => await ApiFunctionTransactionScope.runWithDataSource(dataSource, properties, callback));
		}

		const activeEventManager: EntityManager | undefined = ApiFunctionContextStorage.getTransactionRegistry() ? ApiFunctionContextStorage.getEventManager() : undefined;

		if (activeEventManager) {
			if (properties.observation !== undefined) {
				throw ErrorException("ApiFunctionTransactionScope cannot use an observation when it joins an active transaction on its data source, because the owner of that transaction settles it");
			}

			return await ApiFunctionTransactionScope.runWithEntityManager(activeEventManager, async (): Promise<R> => await callback(activeEventManager));
		}

		return await ApiFunctionTransactionRuntime.execute({
			callback: async (entityManager: EntityManager): Promise<R> => await ApiFunctionTransactionScope.runWithEntityManager(entityManager, async (): Promise<R> => await callback(entityManager)),
			dataSource,
			observation: properties.observation,
			owner: {
				kind: EApiFunctionTransactionOwnerKind.SCOPE,
				name,
			},
		});
	}

	public static async runWithEntityManager<R>(entityManager: EntityManager, callback: () => Promise<R>): Promise<R> {
		const registry: ApiFunctionTransactionRegistry | undefined = ApiFunctionContextStorage.getTransactionRegistryForEntityManager(entityManager);

		if (!registry || registry !== ApiFunctionContextStorage.getTransactionRegistry() || ApiFunctionContextStorage.getEventManager() !== entityManager || ApiFunctionContextStorage.getTransactionQueryRunner()?.manager !== entityManager) {
			throw ErrorException("ApiFunctionTransactionScope.runWithEntityManager requires an existing Automator transaction owner registry");
		}

		const entity: new () => IApiBaseEntity = Object;

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
		return ErrorException("ApiFunctionTransactionScope operations require a decorated service context");
	}
}
