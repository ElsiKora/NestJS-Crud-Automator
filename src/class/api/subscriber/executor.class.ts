import type { EApiFunctionType } from "@enum/decorator/api/function-type.enum";
import type { EApiSubscriberOnType } from "@enum/decorator/api/on-type.enum";
import type { EApiRouteType } from "@enum/decorator/api/route-type.enum";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiSubscriberFunction, IApiSubscriberRoute } from "@interface/class/api/subscriber";
import type { IApiSubscriberFunctionErrorExecutionContext } from "@interface/class/api/subscriber/function/error-execution-context.interface";
import type { IApiSubscriberFunctionExecutionContext } from "@interface/class/api/subscriber/function/execution/context.interface";
import type { IApiSubscriberRouteErrorExecutionContext } from "@interface/class/api/subscriber/route/error-execution-context.interface";
import type { IApiSubscriberRouteExecutionContext } from "@interface/class/api/subscriber/route/execution/context.interface";

import { CONTROLLER_API_DECORATOR_CONSTANT } from "@constant/decorator/api/controller.constant";
import { SERVICE_API_DECORATOR_CONSTANT } from "@constant/decorator/api/service.constant";
import { CamelCaseString } from "@utility/camel-case-string.utility";
import { LoggerUtility } from "@utility/logger.utility";

import { apiSubscriberRegistry } from "./registry.class";

const subscriberLogger: LoggerUtility = LoggerUtility.getLogger("ApiSubscriberExecutor");

export class ApiSubscriberExecutor {
	public static async executeFunctionErrorSubscribers<E extends IApiBaseEntity, TInput>(constructor: new (...arguments_: Array<unknown>) => unknown, entity: E, functionType: EApiFunctionType, onType: EApiSubscriberOnType, context: IApiSubscriberFunctionErrorExecutionContext<E, TInput>, error: Error): Promise<void> {
		if (!Reflect.hasMetadata(SERVICE_API_DECORATOR_CONSTANT.OBSERVABLE_METADATA_KEY, constructor)) {
			return;
		}

		const entityName: string = ApiSubscriberExecutor.resolveEntityName(entity, context);
		const subscribers: Array<IApiSubscriberFunction<IApiBaseEntity>> = apiSubscriberRegistry.getFunctionSubscribers(entityName);

		for (const subscriber of subscribers) {
			const hookName: string = `on${onType}${CamelCaseString(functionType)}`;
			const hook: unknown = subscriber[hookName as keyof IApiSubscriberFunction<IApiBaseEntity>];

			if (typeof hook === "function") {
				subscriberLogger.verbose(`Executing function error hook ${hookName} from ${subscriber.constructor.name} for entity ${entityName}`);
				await hook.call(subscriber, context, error);
			}
		}
	}

	public static async executeFunctionSubscribers<E extends IApiBaseEntity, TResult, TInput>(constructor: new (...arguments_: Array<unknown>) => unknown, entity: E, functionType: EApiFunctionType, onType: EApiSubscriberOnType, context: IApiSubscriberFunctionExecutionContext<E, TResult, TInput>): Promise<TResult | undefined> {
		if (!Reflect.hasMetadata(SERVICE_API_DECORATOR_CONSTANT.OBSERVABLE_METADATA_KEY, constructor)) {
			return context.result;
		}

		const entityName: string = ApiSubscriberExecutor.resolveEntityName(entity, context);
		const subscribers: Array<IApiSubscriberFunction<IApiBaseEntity>> = apiSubscriberRegistry.getFunctionSubscribers(entityName);
		let result: TResult | undefined = context.result;

		for (const subscriber of subscribers) {
			const hookName: string = `on${onType}${CamelCaseString(functionType)}`;
			const hook: unknown = subscriber[hookName as keyof IApiSubscriberFunction<IApiBaseEntity>];

			if (typeof hook === "function") {
				subscriberLogger.verbose(`Executing function hook ${hookName} from ${subscriber.constructor.name} for entity ${entityName}`);
				const hookResult: TResult | undefined = (await hook.call(subscriber, { ...context, result })) as TResult | undefined;

				if (hookResult !== undefined) {
					result = hookResult as TResult;
				}
			}
		}

		return result;
	}

	public static async executeRouteErrorSubscribers<E extends IApiBaseEntity, TInput>(constructor: new (...arguments_: Array<unknown>) => unknown, entity: E, routeType: EApiRouteType, onType: EApiSubscriberOnType, context: IApiSubscriberRouteErrorExecutionContext<E, TInput>, error: Error): Promise<void> {
		if (!Reflect.hasMetadata(CONTROLLER_API_DECORATOR_CONSTANT.OBSERVABLE_METADATA_KEY, constructor)) {
			return;
		}

		const entityName: string = ApiSubscriberExecutor.resolveEntityName(entity, context);
		const subscribers: Array<IApiSubscriberRoute<IApiBaseEntity>> = apiSubscriberRegistry.getRouteSubscribers(entityName);

		for (const subscriber of subscribers) {
			const hookName: string = `on${onType}${CamelCaseString(routeType)}`;
			const hook: unknown = subscriber[hookName as keyof IApiSubscriberRoute<IApiBaseEntity>];

			if (typeof hook === "function") {
				subscriberLogger.verbose(`Executing route error hook ${hookName} from ${subscriber.constructor.name} for entity ${entityName}`);
				await hook.call(subscriber, context, error);
			}
		}
	}

	public static async executeRouteSubscribers<E extends IApiBaseEntity, TResult, TInput>(constructor: new (...arguments_: Array<unknown>) => unknown, entity: E, routeType: EApiRouteType, onType: EApiSubscriberOnType, context: IApiSubscriberRouteExecutionContext<E, TResult, TInput>): Promise<TResult | undefined> {
		if (!Reflect.hasMetadata(CONTROLLER_API_DECORATOR_CONSTANT.OBSERVABLE_METADATA_KEY, constructor)) {
			return context.result;
		}

		const entityName: string = ApiSubscriberExecutor.resolveEntityName(entity, context);
		const subscribers: Array<IApiSubscriberRoute<IApiBaseEntity>> = apiSubscriberRegistry.getRouteSubscribers(entityName);
		let result: TResult | undefined = context.result;

		for (const subscriber of subscribers) {
			const hookName: string = `on${onType}${CamelCaseString(routeType)}`;
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
}
