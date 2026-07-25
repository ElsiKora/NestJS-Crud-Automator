import type { EApiRouteType } from "@enum/decorator/api/route";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiSubscriberFunction, IApiSubscriberRoute } from "@interface/class/api/subscriber";
import type { IApiSubscriberFunctionErrorExecutionContext } from "@interface/class/api/subscriber/function/error-execution-context.interface";
import type { IApiSubscriberFunctionExecutionContext } from "@interface/class/api/subscriber/function/execution/context";
import type { IApiSubscriberRouteErrorExecutionContext } from "@interface/class/api/subscriber/route/error-execution-context.interface";
import type { IApiSubscriberRouteExecutionContext } from "@interface/class/api/subscriber/route/execution/context";
import type { IApiFunctionSubscriberProperties } from "@interface/decorator/api/subscriber";

import { ApiFunctionContextStorage } from "@class/api/function/context-storage.class";
import { apiSubscriberRegistry } from "@class/api/subscriber/registry.class";
import { CONTROLLER_API_DECORATOR_CONSTANT } from "@constant/decorator/api/controller.constant";
import { SERVICE_API_DECORATOR_CONSTANT } from "@constant/decorator/api/service.constant";
import { EApiFunctionSubscriberTransactionExpectation, EApiFunctionType, EApiSubscriberOnType } from "@enum/decorator/api";
import { CamelCaseString } from "@utility/camel-case-string.utility";
import { ErrorException } from "@utility/error/exception.utility";
import { LoggerUtility } from "@utility/logger.utility";

const subscriberLogger: LoggerUtility = LoggerUtility.getLogger("ApiSubscriberExecutor");

export class ApiSubscriberExecutor {
	public static async executeFunctionBeforeSubscribers<E extends IApiBaseEntity, TResult, TInput>(constructor: new (...arguments_: Array<unknown>) => unknown, entity: E, functionType: EApiFunctionType, context: IApiSubscriberFunctionExecutionContext<E, TResult, TInput>, action?: string): Promise<TResult | undefined> {
		try {
			const result: TResult | undefined = await ApiSubscriberExecutor.executeFunctionSubscribers(constructor, entity, functionType, EApiSubscriberOnType.BEFORE, context, action);

			ApiSubscriberExecutor.assertFunctionSubscribersTransactionExpectation(constructor, entity, functionType, EApiSubscriberOnType.AFTER, context, action);

			return result;
		} catch (error) {
			const errorExecutionContext: IApiSubscriberFunctionErrorExecutionContext<E, TInput> = {
				action: context.action,
				DATA: context.DATA,
				ENTITY: context.ENTITY,
				FUNCTION_TYPE: context.FUNCTION_TYPE,
			};

			await ApiSubscriberExecutor.executeFunctionErrorSubscribers(constructor, entity, functionType, EApiSubscriberOnType.BEFORE_ERROR, errorExecutionContext, error as Error, action ?? context.action);

			throw error;
		}
	}

	public static async executeFunctionErrorSubscribers<E extends IApiBaseEntity, TInput>(constructor: new (...arguments_: Array<unknown>) => unknown, entity: E, functionType: EApiFunctionType, onType: EApiSubscriberOnType, context: IApiSubscriberFunctionErrorExecutionContext<E, TInput>, error: Error, action?: string): Promise<void> {
		if (!Reflect.hasMetadata(SERVICE_API_DECORATOR_CONSTANT.OBSERVABLE_METADATA_KEY, constructor)) {
			return;
		}

		const entityName: string = ApiSubscriberExecutor.resolveEntityName(entity, context);
		const subscribers: Array<IApiSubscriberFunction<IApiBaseEntity>> = apiSubscriberRegistry.getFunctionSubscribers(entityName, functionType, action ?? context.action);

		await ApiFunctionContextStorage.runWithoutStepContext(async (): Promise<void> => {
			for (const subscriber of subscribers) {
				const hookName: string = ApiSubscriberExecutor.resolveHookName(onType, functionType);
				const hook: unknown = subscriber[hookName as keyof IApiSubscriberFunction<IApiBaseEntity>];

				if (typeof hook === "function") {
					const properties: IApiFunctionSubscriberProperties<IApiBaseEntity> | undefined = apiSubscriberRegistry.getFunctionSubscriberProperties(subscriber);
					ApiSubscriberExecutor.assertFunctionSubscriberTransactionExpectation(subscriber.constructor.name, properties, context);
					subscriberLogger.verbose(`Executing function error hook ${hookName} from ${subscriber.constructor.name} for entity ${entityName}`);
					await hook.call(subscriber, context, error);
				}
			}
		});
	}

	public static async executeFunctionSubscribers<E extends IApiBaseEntity, TResult, TInput>(constructor: new (...arguments_: Array<unknown>) => unknown, entity: E, functionType: EApiFunctionType, onType: EApiSubscriberOnType, context: IApiSubscriberFunctionExecutionContext<E, TResult, TInput>, action?: string): Promise<TResult | undefined> {
		if (!Reflect.hasMetadata(SERVICE_API_DECORATOR_CONSTANT.OBSERVABLE_METADATA_KEY, constructor)) {
			return context.result;
		}

		const entityName: string = ApiSubscriberExecutor.resolveEntityName(entity, context);
		const subscribers: Array<IApiSubscriberFunction<IApiBaseEntity>> = apiSubscriberRegistry.getFunctionSubscribers(entityName, functionType, action ?? context.action);
		let result: TResult | undefined = context.result;

		await ApiFunctionContextStorage.runWithoutStepContext(async (): Promise<void> => {
			for (const subscriber of subscribers) {
				const hookName: string = ApiSubscriberExecutor.resolveHookName(onType, functionType);
				const hook: unknown = subscriber[hookName as keyof IApiSubscriberFunction<IApiBaseEntity>];

				if (typeof hook === "function") {
					const properties: IApiFunctionSubscriberProperties<IApiBaseEntity> | undefined = apiSubscriberRegistry.getFunctionSubscriberProperties(subscriber);
					ApiSubscriberExecutor.assertFunctionSubscriberTransactionExpectation(subscriber.constructor.name, properties, context);
					subscriberLogger.verbose(`Executing function hook ${hookName} from ${subscriber.constructor.name} for entity ${entityName}`);
					const hookResult: TResult | undefined = (await hook.call(subscriber, { ...context, result })) as TResult | undefined;

					if (hookResult !== undefined) {
						result = hookResult;
					}
				}
			}
		});

		return result;
	}

	public static async executeRouteErrorSubscribers<E extends IApiBaseEntity, TInput>(constructor: new (...arguments_: Array<unknown>) => unknown, entity: E, routeType: EApiRouteType | undefined, onType: EApiSubscriberOnType, context: IApiSubscriberRouteErrorExecutionContext<E, TInput>, error: Error, action?: string): Promise<void> {
		if (!Reflect.hasMetadata(CONTROLLER_API_DECORATOR_CONSTANT.OBSERVABLE_METADATA_KEY, constructor)) {
			return;
		}

		const entityName: string = ApiSubscriberExecutor.resolveEntityName(entity, context);
		const subscribers: Array<IApiSubscriberRoute<IApiBaseEntity>> = apiSubscriberRegistry.getRouteSubscribers(entityName, constructor, routeType, action ?? context.action);

		for (const subscriber of subscribers) {
			const hookName: string = ApiSubscriberExecutor.resolveHookName(onType, routeType);
			const hook: unknown = subscriber[hookName as keyof IApiSubscriberRoute<IApiBaseEntity>];

			if (typeof hook === "function") {
				subscriberLogger.verbose(`Executing route error hook ${hookName} from ${subscriber.constructor.name} for entity ${entityName}`);
				await hook.call(subscriber, context, error);
			}
		}
	}

	public static async executeRouteSubscribers<E extends IApiBaseEntity, TResult, TInput>(constructor: new (...arguments_: Array<unknown>) => unknown, entity: E, routeType: EApiRouteType | undefined, onType: EApiSubscriberOnType, context: IApiSubscriberRouteExecutionContext<E, TResult, TInput>, action?: string): Promise<TResult | undefined> {
		if (!Reflect.hasMetadata(CONTROLLER_API_DECORATOR_CONSTANT.OBSERVABLE_METADATA_KEY, constructor)) {
			return context.result;
		}

		const entityName: string = ApiSubscriberExecutor.resolveEntityName(entity, context);
		const subscribers: Array<IApiSubscriberRoute<IApiBaseEntity>> = apiSubscriberRegistry.getRouteSubscribers(entityName, constructor, routeType, action ?? context.action);
		let result: TResult | undefined = context.result;

		for (const subscriber of subscribers) {
			const hookName: string = ApiSubscriberExecutor.resolveHookName(onType, routeType);
			const hook: unknown = subscriber[hookName as keyof IApiSubscriberRoute<IApiBaseEntity>];

			if (typeof hook === "function") {
				subscriberLogger.verbose(`Executing route hook ${hookName} from ${subscriber.constructor.name} for entity ${entityName}`);
				const hookResult: TResult | undefined = (await hook.call(subscriber, { ...context, result })) as TResult | undefined;

				if (hookResult !== undefined) {
					result = hookResult;
				}
			}
		}

		return result;
	}

	private static assertFunctionSubscribersTransactionExpectation(constructor: new (...arguments_: Array<unknown>) => unknown, entity: IApiBaseEntity, functionType: EApiFunctionType, onType: EApiSubscriberOnType, context: { action?: string; DATA?: unknown }, action?: string): void {
		if (!Reflect.hasMetadata(SERVICE_API_DECORATOR_CONSTANT.OBSERVABLE_METADATA_KEY, constructor)) {
			return;
		}

		const entityName: string = ApiSubscriberExecutor.resolveEntityName(entity, context);
		const subscribers: Array<IApiSubscriberFunction<IApiBaseEntity>> = apiSubscriberRegistry.getFunctionSubscribers(entityName, functionType, action ?? context.action);

		for (const subscriber of subscribers) {
			if (!ApiSubscriberExecutor.hasFunctionSubscriberHook(subscriber, onType, functionType)) {
				continue;
			}

			const properties: IApiFunctionSubscriberProperties<IApiBaseEntity> | undefined = apiSubscriberRegistry.getFunctionSubscriberProperties(subscriber);
			ApiSubscriberExecutor.assertFunctionSubscriberTransactionExpectation(subscriber.constructor.name, properties, context);
		}
	}

	private static assertFunctionSubscriberTransactionExpectation(subscriberName: string, properties: IApiFunctionSubscriberProperties<IApiBaseEntity> | undefined, context: { DATA?: unknown }): void {
		const transactionExpectation: EApiFunctionSubscriberTransactionExpectation | undefined = properties?.transaction?.expectation;

		if (transactionExpectation !== EApiFunctionSubscriberTransactionExpectation.MANDATORY && transactionExpectation !== EApiFunctionSubscriberTransactionExpectation.REQUIRED) {
			return;
		}

		const eventManager: unknown = ApiSubscriberExecutor.resolveFunctionSubscriberEventManager(context);

		if (eventManager === null || eventManager === undefined) {
			throw ErrorException(`Function subscriber "${subscriberName}" declares transaction expectation "${transactionExpectation}" but no event manager was provided`);
		}
	}

	private static hasFunctionSubscriberHook(subscriber: IApiSubscriberFunction<IApiBaseEntity>, onType: EApiSubscriberOnType, functionType: EApiFunctionType): boolean {
		return typeof subscriber[ApiSubscriberExecutor.resolveHookName(onType, functionType) as keyof IApiSubscriberFunction<IApiBaseEntity>] === "function";
	}

	private static resolveEntityName(entity: IApiBaseEntity, context?: { DATA?: unknown }): string {
		const data: unknown = context?.DATA;
		const entityMetadataName: unknown = data && typeof data === "object" && "entityMetadata" in data ? (data as { entityMetadata?: { name?: unknown } }).entityMetadata?.name : undefined;

		if (typeof entityMetadataName === "string" && entityMetadataName.length > 0) {
			return entityMetadataName;
		}

		const propertyEntityName: unknown = data && typeof data === "object" && "properties" in data ? (data as { properties?: { entity?: { name?: unknown } } }).properties?.entity?.name : undefined;

		if (typeof propertyEntityName === "string" && propertyEntityName.length > 0) {
			return propertyEntityName;
		}

		const repositoryName: unknown = data && typeof data === "object" && "repository" in data ? ((data as { repository?: { metadata?: { name?: unknown }; target?: { name?: unknown } } }).repository?.metadata?.name ?? (data as { repository?: { target?: { name?: unknown } } }).repository?.target?.name) : undefined;

		if (typeof repositoryName === "string" && repositoryName.length > 0) {
			return repositoryName;
		}

		return entity.constructor.name;
	}

	private static resolveFunctionSubscriberEventManager(context: { DATA?: unknown }): unknown {
		const data: unknown = context.DATA;

		return data && typeof data === "object" && "eventManager" in data ? (data as { eventManager?: unknown }).eventManager : undefined;
	}

	private static resolveHookName(onType: EApiSubscriberOnType, lifecycleType: EApiFunctionType | EApiRouteType | undefined): string {
		return lifecycleType === undefined || lifecycleType === EApiFunctionType.CUSTOM ? `on${onType}Custom` : `on${onType}${CamelCaseString(lifecycleType)}`;
	}
}
