import type { AsyncLocalStorage } from "node:async_hooks";

import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiFunctionContext } from "@interface/class/api/function";

import { AsyncLocalStorage as NodeAsyncLocalStorage } from "node:async_hooks";

export class ApiFunctionContextStorage {
	private static readonly STORAGE: AsyncLocalStorage<IApiFunctionContext<IApiBaseEntity>> = new NodeAsyncLocalStorage<IApiFunctionContext<IApiBaseEntity>>();

	public static get<E extends IApiBaseEntity>(): IApiFunctionContext<E> | undefined {
		return ApiFunctionContextStorage.STORAGE.getStore() as IApiFunctionContext<E> | undefined;
	}

	public static run<E extends IApiBaseEntity, R>(context: IApiFunctionContext<E>, callback: () => Promise<R>): Promise<R> {
		return ApiFunctionContextStorage.STORAGE.run(context as unknown as IApiFunctionContext<IApiBaseEntity>, callback);
	}
}
