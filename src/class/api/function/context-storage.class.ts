import type { AsyncLocalStorage } from "node:async_hooks";

import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiFunctionContext, IApiFunctionStepContext } from "@interface/class/api/function";
import type { EntityManager } from "typeorm";

import { AsyncLocalStorage as NodeAsyncLocalStorage } from "node:async_hooks";

type TApiFunctionContextStorageEntry<E extends IApiBaseEntity> = { context: IApiFunctionContext<E>; kind: "function" } | { context: IApiFunctionStepContext<E>; kind: "step" };

export class ApiFunctionContextStorage {
	private static readonly STORAGE: AsyncLocalStorage<TApiFunctionContextStorageEntry<IApiBaseEntity>> = new NodeAsyncLocalStorage<TApiFunctionContextStorageEntry<IApiBaseEntity>>();

	public static get<E extends IApiBaseEntity>(): IApiFunctionContext<E> | undefined {
		const entry: TApiFunctionContextStorageEntry<IApiBaseEntity> | undefined = ApiFunctionContextStorage.STORAGE.getStore();

		return entry?.kind === "function" ? (entry.context as unknown as IApiFunctionContext<E>) : undefined;
	}

	public static getEventManager(): EntityManager | undefined {
		return ApiFunctionContextStorage.STORAGE.getStore()?.context.eventManager;
	}

	public static getStep<E extends IApiBaseEntity>(): IApiFunctionStepContext<E> | undefined {
		const entry: TApiFunctionContextStorageEntry<IApiBaseEntity> | undefined = ApiFunctionContextStorage.STORAGE.getStore();

		return entry?.kind === "step" ? (entry.context as IApiFunctionStepContext<E>) : undefined;
	}

	public static run<E extends IApiBaseEntity, R>(context: IApiFunctionContext<E>, callback: () => Promise<R>): Promise<R> {
		return ApiFunctionContextStorage.STORAGE.run({ context: context as unknown as IApiFunctionContext<IApiBaseEntity>, kind: "function" }, callback);
	}

	public static runStep<E extends IApiBaseEntity, R>(context: IApiFunctionStepContext<E>, callback: () => Promise<R>): Promise<R> {
		return ApiFunctionContextStorage.STORAGE.run({ context, kind: "step" }, callback);
	}
}
