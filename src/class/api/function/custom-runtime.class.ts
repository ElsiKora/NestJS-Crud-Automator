import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiFunctionContext } from "@interface/class/api/function";
import type { IApiSubscriberFunctionErrorExecutionContext, IApiSubscriberFunctionExecutionContext, IApiSubscriberFunctionExecutionContextData } from "@interface/class/api/subscriber/function";
import type { IApiGetListResponseResult } from "@interface/decorator/api";
import type { IApiFunctionCustomProperties } from "@interface/decorator/api/function";
import type { TApiFunctionCreateProperties, TApiFunctionDeleteCriteria, TApiFunctionGetListProperties, TApiFunctionGetManyProperties, TApiFunctionGetProperties, TApiFunctionUpdateCriteria, TApiFunctionUpdateProperties } from "@type/decorator/api/function";
import type { EntityManager, Repository } from "typeorm";

import { ApiFunctionContextStorage } from "@class/api/function/context-storage.class";
import { ApiSubscriberExecutor } from "@class/api/subscriber/executor.class";
import { EApiFunctionTransactionMode, EApiFunctionType, EApiSubscriberOnType } from "@enum/decorator/api";
import { ErrorException } from "@utility/error/exception.utility";

export class ApiFunctionCustomRuntime {
	public static async execute<E extends IApiBaseEntity>(options: { functionArguments: Array<unknown>; originalMethod: (...arguments_: Array<unknown>) => Promise<unknown>; properties: IApiFunctionCustomProperties<E>; target: { repository: Repository<E> }; transactionMode: EApiFunctionTransactionMode }): Promise<unknown> {
		const activeContext: IApiFunctionContext<E> | undefined = ApiFunctionContextStorage.get<E>();
		let eventManager: EntityManager | undefined;

		try {
			eventManager = ApiFunctionCustomRuntime.resolveEventManager(options.transactionMode, activeContext);
		} catch (error) {
			await ApiFunctionCustomRuntime.executeErrorSubscribers(options, undefined, EApiSubscriberOnType.BEFORE_ERROR, error);

			throw error;
		}

		if (options.transactionMode === EApiFunctionTransactionMode.REQUIRED && !eventManager) {
			return await options.target.repository.manager.transaction(async (transactionManager: EntityManager): Promise<unknown> => await ApiFunctionCustomRuntime.executeWithEventManager({ ...options, eventManager: transactionManager }));
		}

		return await ApiFunctionCustomRuntime.executeWithEventManager({ ...options, eventManager });
	}

	private static createContext<E extends IApiBaseEntity>(options: { eventManager?: EntityManager; properties: IApiFunctionCustomProperties<E>; target: { repository: Repository<E> } }): IApiFunctionContext<E> {
		const repository: Repository<E> = options.eventManager?.getRepository(options.properties.entity) ?? options.target.repository;

		return {
			entity: options.properties.entity,
			eventManager: options.eventManager,
			getRepository: <T extends IApiBaseEntity>(repositoryEntity: new () => T): Repository<T> => options.eventManager?.getRepository(repositoryEntity) ?? options.target.repository.manager.getRepository(repositoryEntity),
			operations: {
				create: async (properties: TApiFunctionCreateProperties<E>): Promise<E> => await (options.target as unknown as { create(properties: unknown): Promise<E> }).create(properties),
				delete: async (criteria: Array<TApiFunctionDeleteCriteria<E>> | TApiFunctionDeleteCriteria<E>): Promise<void> => {
					await (options.target as unknown as { delete(criteria: unknown): Promise<void> }).delete(criteria);
				},
				get: async (properties: TApiFunctionGetProperties<E>): Promise<E> => await (options.target as unknown as { get(properties: unknown): Promise<E> }).get(properties),
				getList: async (properties: TApiFunctionGetListProperties<E>): Promise<IApiGetListResponseResult<E>> => await (options.target as unknown as { getList(properties: unknown): Promise<IApiGetListResponseResult<E>> }).getList(properties),
				getMany: async (properties: TApiFunctionGetManyProperties<E>): Promise<Array<E>> => await (options.target as unknown as { getMany(properties: unknown): Promise<Array<E>> }).getMany(properties),
				getRepository: <T extends IApiBaseEntity>(repositoryEntity: new () => T): Repository<T> => options.eventManager?.getRepository(repositoryEntity) ?? options.target.repository.manager.getRepository(repositoryEntity),
				update: async (criteria: Array<TApiFunctionUpdateCriteria<E>> | TApiFunctionUpdateCriteria<E>, properties: TApiFunctionUpdateProperties<E>): Promise<E> => await (options.target as unknown as { update(criteria: unknown, properties: unknown): Promise<E> }).update(criteria, properties),
			},
			repository,
		};
	}

	private static async executeErrorSubscribers<E extends IApiBaseEntity>(options: { eventManager?: EntityManager; properties: IApiFunctionCustomProperties<E>; target: { repository: Repository<E> } }, eventManager: EntityManager | undefined, onType: EApiSubscriberOnType, error: unknown): Promise<void> {
		const entityInstance: E = new options.properties.entity();

		const errorExecutionContext: IApiSubscriberFunctionErrorExecutionContext<E, IApiSubscriberFunctionExecutionContextData<E>> = {
			action: options.properties.action,
			DATA: { eventManager, repository: options.target.repository },
			ENTITY: entityInstance,
			FUNCTION_TYPE: EApiFunctionType.CUSTOM,
		};

		await ApiSubscriberExecutor.executeFunctionErrorSubscribers(options.target.constructor as new (...constructorArguments: Array<unknown>) => unknown, entityInstance, EApiFunctionType.CUSTOM, onType, errorExecutionContext, error as Error, options.properties.action);
	}

	private static async executeWithEventManager<E extends IApiBaseEntity>(options: { eventManager?: EntityManager; functionArguments: Array<unknown>; originalMethod: (...arguments_: Array<unknown>) => Promise<unknown>; properties: IApiFunctionCustomProperties<E>; target: { repository: Repository<E> } }): Promise<unknown> {
		const entityInstance: E = new options.properties.entity();
		const context: IApiFunctionContext<E> = ApiFunctionCustomRuntime.createContext(options);

		const executionContext: IApiSubscriberFunctionExecutionContext<E, Array<unknown>, IApiSubscriberFunctionExecutionContextData<E>> = {
			action: options.properties.action,
			DATA: { eventManager: options.eventManager, repository: options.target.repository },
			ENTITY: entityInstance,
			FUNCTION_TYPE: EApiFunctionType.CUSTOM,
			result: options.functionArguments,
		};
		let finalArguments: Array<unknown>;

		try {
			const beforeResult: Array<unknown> | undefined = await ApiSubscriberExecutor.executeFunctionSubscribers(options.target.constructor as new (...constructorArguments: Array<unknown>) => unknown, entityInstance, EApiFunctionType.CUSTOM, EApiSubscriberOnType.BEFORE, executionContext, options.properties.action);
			finalArguments = beforeResult ?? options.functionArguments;
		} catch (error) {
			await ApiFunctionCustomRuntime.executeErrorSubscribers(options, options.eventManager, EApiSubscriberOnType.BEFORE_ERROR, error);

			throw error;
		}

		try {
			const result: unknown = await ApiFunctionContextStorage.run(context, async (): Promise<unknown> => await options.originalMethod.apply(options.target, finalArguments));

			const afterExecutionContext: IApiSubscriberFunctionExecutionContext<E, unknown, IApiSubscriberFunctionExecutionContextData<E>> = {
				action: options.properties.action,
				DATA: { eventManager: options.eventManager, repository: options.target.repository },
				ENTITY: entityInstance,
				FUNCTION_TYPE: EApiFunctionType.CUSTOM,
				result,
			};

			return (await ApiSubscriberExecutor.executeFunctionSubscribers(options.target.constructor as new (...constructorArguments: Array<unknown>) => unknown, entityInstance, EApiFunctionType.CUSTOM, EApiSubscriberOnType.AFTER, afterExecutionContext, options.properties.action)) ?? result;
		} catch (error) {
			await ApiFunctionCustomRuntime.executeErrorSubscribers(options, options.eventManager, EApiSubscriberOnType.AFTER_ERROR, error);

			throw error;
		}
	}

	private static resolveEventManager<E extends IApiBaseEntity>(transactionMode: EApiFunctionTransactionMode, activeContext?: IApiFunctionContext<E>): EntityManager | undefined {
		if (transactionMode === EApiFunctionTransactionMode.NONE && activeContext?.eventManager) {
			throw ErrorException("ApiFunctionCustom transaction mode NONE cannot run inside an active transaction");
		}

		if (transactionMode === EApiFunctionTransactionMode.MANDATORY && !activeContext?.eventManager) {
			throw ErrorException("ApiFunctionCustom transaction mode MANDATORY requires an active transaction");
		}

		return transactionMode === EApiFunctionTransactionMode.NONE ? undefined : activeContext?.eventManager;
	}
}
