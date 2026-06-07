import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiFunctionContext } from "@interface/class/api/function";
import type { IApiSubscriberFunctionErrorExecutionContext, IApiSubscriberFunctionExecutionContext, IApiSubscriberFunctionExecutionContextData } from "@interface/class/api/subscriber/function";
import type { IApiFunctionCustomProperties } from "@interface/decorator/api/function";
import type { EntityManager, Repository } from "typeorm";

import { ApiFunctionContextStorage } from "@class/api/function/context-storage.class";
import { ApiFunctionServiceContextFactory } from "@class/api/function/service-context.factory.class";
import { ApiSubscriberExecutor } from "@class/api/subscriber/executor.class";
import { type EApiFunctionTransactionMode, EApiFunctionType, EApiSubscriberOnType } from "@enum/decorator/api";
import { ApiFunctionExecuteWithTransaction } from "@utility/api/function-transaction.utility";

export class ApiFunctionCustomRuntime {
	public static async execute<E extends IApiBaseEntity>(options: { functionArguments: Array<unknown>; originalMethod: (...arguments_: Array<unknown>) => Promise<unknown>; properties: IApiFunctionCustomProperties<E>; target: { repository: Repository<E> }; transactionMode: EApiFunctionTransactionMode }): Promise<unknown> {
		return await ApiFunctionExecuteWithTransaction({
			callback: async (eventManager: EntityManager | undefined): Promise<unknown> => await ApiFunctionCustomRuntime.executeWithEventManager({ ...options, eventManager }),
			entity: options.properties.entity,
			label: "ApiFunctionCustom",
			mode: options.transactionMode,
			onPreflightError: async (eventManager: EntityManager | undefined, error: Error): Promise<void> => {
				await ApiFunctionCustomRuntime.executeErrorSubscribers(options, eventManager, EApiSubscriberOnType.BEFORE_ERROR, error);
			},
			repository: options.target.repository,
			shouldBindTransactionScope: false,
		});
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

		const context: IApiFunctionContext<E> = ApiFunctionServiceContextFactory.create({
			entity: options.properties.entity,
			eventManager: options.eventManager,
			target: options.target,
		});

		const executionContext: IApiSubscriberFunctionExecutionContext<E, Array<unknown>, IApiSubscriberFunctionExecutionContextData<E>> = {
			action: options.properties.action,
			DATA: { eventManager: options.eventManager, repository: options.target.repository },
			ENTITY: entityInstance,
			FUNCTION_TYPE: EApiFunctionType.CUSTOM,
			result: options.functionArguments,
		};
		const beforeResult: Array<unknown> | undefined = await ApiSubscriberExecutor.executeFunctionBeforeSubscribers(options.target.constructor as new (...constructorArguments: Array<unknown>) => unknown, entityInstance, EApiFunctionType.CUSTOM, executionContext, options.properties.action);
		const finalArguments: Array<unknown> = beforeResult ?? options.functionArguments;

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
}
