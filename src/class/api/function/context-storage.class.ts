import type { AsyncLocalStorage } from "node:async_hooks";

import type { ApiFunctionTransactionRegistry } from "@class/api/function/transaction/registry.class";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiFunctionContext, IApiFunctionStepContext } from "@interface/class/api/function";
import type { TApiFunctionContextStorageEntry } from "@type/class/api/function/context-storage-entry.type";
import type { EntityManager, QueryRunner } from "typeorm";

import { AsyncLocalStorage as NodeAsyncLocalStorage } from "node:async_hooks";

import { EApiFunctionContextStorageKind } from "@enum/decorator/api";

export class ApiFunctionContextStorage {
	private static readonly STORAGE: AsyncLocalStorage<TApiFunctionContextStorageEntry<IApiBaseEntity>> = new NodeAsyncLocalStorage<TApiFunctionContextStorageEntry<IApiBaseEntity>>();

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
}
