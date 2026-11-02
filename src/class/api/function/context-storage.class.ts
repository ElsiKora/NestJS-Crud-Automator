import type { AsyncLocalStorage } from "node:async_hooks";

import type { ApiFunctionTransactionRegistry } from "@class/api/function/transaction/registry.class";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiFunctionContext, IApiFunctionStepContext } from "@interface/class/api/function";
import type { TApiFunctionContextStorageEntry } from "@type/class/api/function/context-storage-entry.type";
import type { DataSource, EntityManager, QueryRunner } from "typeorm";

import { AsyncLocalStorage as NodeAsyncLocalStorage } from "node:async_hooks";

import { EApiFunctionContextStorageKind } from "@enum/decorator/api";

export class ApiFunctionContextStorage {
	private static readonly STORAGE: AsyncLocalStorage<TApiFunctionContextStorageEntry<IApiBaseEntity>> = new NodeAsyncLocalStorage<TApiFunctionContextStorageEntry<IApiBaseEntity>>();

	// Transactions of other data sources that a call left, which a call back into their data source joins again.
	private static readonly SUSPENDED: AsyncLocalStorage<ReadonlyMap<DataSource, TApiFunctionContextStorageEntry<IApiBaseEntity>>> = new NodeAsyncLocalStorage<ReadonlyMap<DataSource, TApiFunctionContextStorageEntry<IApiBaseEntity>>>();

	private static readonly TRANSACTION_REGISTRIES: WeakMap<EntityManager, ApiFunctionTransactionRegistry> = new WeakMap<EntityManager, ApiFunctionTransactionRegistry>();

	public static get<E extends IApiBaseEntity>(): IApiFunctionContext<E> | undefined {
		const entry: TApiFunctionContextStorageEntry<IApiBaseEntity> | undefined = ApiFunctionContextStorage.STORAGE.getStore();

		return entry?.kind === EApiFunctionContextStorageKind.FUNCTION ? (entry.context as unknown as IApiFunctionContext<E>) : undefined;
	}

	public static getEventManager(): EntityManager | undefined {
		const entry: TApiFunctionContextStorageEntry<IApiBaseEntity> | undefined = ApiFunctionContextStorage.STORAGE.getStore();

		return entry?.transaction?.entityManager ?? entry?.context.eventManager;
	}

	public static getStep<E extends IApiBaseEntity>(): IApiFunctionStepContext<E> | undefined {
		const entry: TApiFunctionContextStorageEntry<IApiBaseEntity> | undefined = ApiFunctionContextStorage.STORAGE.getStore();

		return entry?.kind === EApiFunctionContextStorageKind.STEP ? (entry.context as IApiFunctionStepContext<E>) : undefined;
	}

	public static getTransactionQueryRunner(): QueryRunner | undefined {
		return ApiFunctionContextStorage.STORAGE.getStore()?.transaction?.queryRunner;
	}

	public static getTransactionRegistry(): ApiFunctionTransactionRegistry | undefined {
		return ApiFunctionContextStorage.STORAGE.getStore()?.transaction?.registry;
	}

	public static getTransactionRegistryForEntityManager(entityManager: EntityManager): ApiFunctionTransactionRegistry | undefined {
		return ApiFunctionContextStorage.TRANSACTION_REGISTRIES.get(entityManager);
	}

	public static run<E extends IApiBaseEntity, R>(context: IApiFunctionContext<E>, callback: () => Promise<R>): Promise<R> {
		return ApiFunctionContextStorage.STORAGE.run(
			{
				context: context as unknown as IApiFunctionContext<IApiBaseEntity>,
				kind: EApiFunctionContextStorageKind.FUNCTION,
				transaction: ApiFunctionContextStorage.STORAGE.getStore()?.transaction,
			},
			callback,
		);
	}

	/**
	 * Runs a callback for a data source other than the one the active transaction belongs to.
	 * The manager of a transaction only works for its own data source, so the callback runs outside it, or back inside a transaction of its data source that an earlier call left.
	 * The left transactions stay in the async context of the callback, also where it runs without a transaction, so any later call back into their data source joins them again.
	 * @template R - Callback result type.
	 * @param {DataSource} dataSource - Data source the callback works on.
	 * @param {() => Promise<R>} callback - Work to run.
	 * @returns {Promise<R>} Callback result.
	 */
	public static runOnDataSource<R>(dataSource: DataSource, callback: () => Promise<R>): Promise<R> {
		const entry: TApiFunctionContextStorageEntry<IApiBaseEntity> | undefined = ApiFunctionContextStorage.STORAGE.getStore();
		const suspended: Map<DataSource, TApiFunctionContextStorageEntry<IApiBaseEntity>> = new Map<DataSource, TApiFunctionContextStorageEntry<IApiBaseEntity>>(ApiFunctionContextStorage.SUSPENDED.getStore());

		if (entry?.transaction) {
			suspended.set(entry.transaction.entityManager.dataSource, entry);
		}

		const resumed: TApiFunctionContextStorageEntry<IApiBaseEntity> | undefined = suspended.get(dataSource);
		suspended.delete(dataSource);

		return ApiFunctionContextStorage.SUSPENDED.run(suspended, (): Promise<R> => ApiFunctionContextStorage.STORAGE.run(resumed ?? { context: {}, kind: EApiFunctionContextStorageKind.TRANSACTION }, callback));
	}

	public static runStep<E extends IApiBaseEntity, R>(context: IApiFunctionStepContext<E>, callback: () => Promise<R>): Promise<R> {
		return ApiFunctionContextStorage.STORAGE.run(
			{
				context,
				kind: EApiFunctionContextStorageKind.STEP,
				transaction: ApiFunctionContextStorage.STORAGE.getStore()?.transaction,
			},
			callback,
		);
	}

	public static async runTransaction<R>(entityManager: EntityManager, queryRunner: QueryRunner, registry: ApiFunctionTransactionRegistry, callback: () => Promise<R>): Promise<R> {
		ApiFunctionContextStorage.TRANSACTION_REGISTRIES.set(entityManager, registry);

		try {
			return await ApiFunctionContextStorage.STORAGE.run(
				{
					context: { eventManager: entityManager },
					kind: EApiFunctionContextStorageKind.TRANSACTION,
					transaction: { entityManager, queryRunner, registry },
				},
				callback,
			);
		} finally {
			if (ApiFunctionContextStorage.TRANSACTION_REGISTRIES.get(entityManager) === registry) {
				ApiFunctionContextStorage.TRANSACTION_REGISTRIES.delete(entityManager);
			}
		}
	}

	public static runWithoutStepContext<R>(callback: () => Promise<R>): Promise<R> {
		const entry: TApiFunctionContextStorageEntry<IApiBaseEntity> | undefined = ApiFunctionContextStorage.STORAGE.getStore();

		if (entry?.kind !== EApiFunctionContextStorageKind.STEP) {
			return callback();
		}

		return ApiFunctionContextStorage.STORAGE.run(
			{
				context: { eventManager: entry.context.eventManager },
				kind: EApiFunctionContextStorageKind.TRANSACTION,
				transaction: entry.transaction,
			},
			callback,
		);
	}

	/**
	 * Tells whether work on a data source has to run through {@link ApiFunctionContextStorage.runOnDataSource} instead of the current transaction context.
	 * It has to when the active transaction belongs to another data source, or when no transaction is active and an earlier call left a transaction of this same data source, which the work joins again.
	 * Outside both, the data source of the work is never read.
	 * @param {() => DataSource} readDataSource - Reads the data source the work runs on.
	 * @returns {boolean} Whether the work runs through {@link ApiFunctionContextStorage.runOnDataSource}.
	 */
	public static shouldRunOnDataSource(readDataSource: () => DataSource): boolean {
		const entry: TApiFunctionContextStorageEntry<IApiBaseEntity> | undefined = ApiFunctionContextStorage.STORAGE.getStore();

		if (entry?.transaction) {
			return entry.transaction.entityManager.dataSource !== readDataSource();
		}

		const suspended: ReadonlyMap<DataSource, TApiFunctionContextStorageEntry<IApiBaseEntity>> | undefined = ApiFunctionContextStorage.SUSPENDED.getStore();

		return suspended !== undefined && suspended.size > 0 && suspended.has(readDataSource());
	}
}
