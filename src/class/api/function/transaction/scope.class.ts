import type { ApiFunctionTransactionRegistry } from "@class/api/function/transaction/registry.class";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiFunctionContext, IApiFunctionTransactionObservationOptions } from "@interface/class/api/function";
import type { DataSource, EntityManager, Repository } from "typeorm";

import { ApiFunctionContextStorage } from "@class/api/function/context-storage.class";
import { ApiFunctionTransactionRuntime } from "@class/api/function/transaction/runtime.class";
import { EApiFunctionTransactionOwnerKind } from "@enum/decorator/api";
import { ErrorException } from "@utility/error/exception.utility";

export class ApiFunctionTransactionScope {
	/**
	 * Returns the value bound under a key to the current Automator transaction.
	 * The current transaction is the one the async context of the call runs in: the owner and every REQUIRED or MANDATORY participant that joined it, and a `runWithDataSource` that joined it, see the same values.
	 * A transaction of another DataSource that a call opened inside it is a different transaction with values of its own, and a call back into the first DataSource sees the values of the first one again.
	 * @template T - Value type.
	 * @param {symbol} key - Key the value is bound under.
	 * @returns {T | undefined} The bound value, or undefined outside an Automator transaction, inside a different one, or after the transaction committed or rolled back.
	 */
	// eslint-disable-next-line @elsikora/typescript/no-unnecessary-type-parameters
	public static getValue<T>(key: symbol): T | undefined {
		return ApiFunctionContextStorage.getTransactionRegistry()?.getValue(key) as T | undefined;
	}

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

	/**
	 * Binds a value under a key to the current Automator transaction for the callback, and puts back what the key held before once the callback settles, also when it throws.
	 * The value belongs to the transaction, not to the callback's async context: parallel work in the same transaction sees it while the callback runs.
	 * @template T - Value type.
	 * @template R - Callback result type.
	 * @param {symbol} key - Key the value is bound under.
	 * @param {T} value - Value to bind.
	 * @param {() => Promise<R>} callback - Work that sees the value.
	 * @returns {Promise<R>} Callback result.
	 * @throws {Error} When no Automator transaction is active.
	 */
	// eslint-disable-next-line @elsikora/typescript/no-unnecessary-type-parameters
	public static async runWithValue<T, R>(key: symbol, value: T, callback: () => Promise<R>): Promise<R> {
		const registry: ApiFunctionTransactionRegistry = ApiFunctionTransactionScope.getValueRegistry("runWithValue", key);
		const previous: { value: unknown } | undefined = registry.hasValue(key) ? { value: registry.getValue(key) } : undefined;

		registry.setValue(key, value);

		try {
			return await callback();
		} finally {
			registry.restoreValue(key, previous);
		}
	}

	/**
	 * Binds a value under a key to the current Automator transaction, see {@link ApiFunctionTransactionScope.getValue} for which transaction that is.
	 * The value is released when the transaction commits or rolls back.
	 * @template T - Value type.
	 * @param {symbol} key - Key the value is bound under.
	 * @param {T} value - Value to bind.
	 * @returns {void}
	 * @throws {Error} When no Automator transaction is active.
	 */
	// eslint-disable-next-line @elsikora/typescript/no-unnecessary-type-parameters
	public static setValue<T>(key: symbol, value: T): void {
		ApiFunctionTransactionScope.getValueRegistry("setValue", key).setValue(key, value);
	}

	private static createMissingServiceContextError(): Error {
		return ErrorException("ApiFunctionTransactionScope operations require a decorated service context");
	}

	private static getValueRegistry(methodName: string, key: symbol): ApiFunctionTransactionRegistry {
		if (typeof key !== "symbol") {
			throw ErrorException(`ApiFunctionTransactionScope.${methodName} requires a symbol key`);
		}

		const registry: ApiFunctionTransactionRegistry | undefined = ApiFunctionContextStorage.getTransactionRegistry();

		if (!registry) {
			throw ErrorException(`ApiFunctionTransactionScope.${methodName} requires an active Automator transaction`);
		}

		return registry;
	}
}
