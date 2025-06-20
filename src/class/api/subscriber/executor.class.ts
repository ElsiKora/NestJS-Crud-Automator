import type { EApiFunctionType } from "@enum/decorator/api/function";
import type { EApiSubscriberOnType } from "@enum/decorator/api/on-type.enum";
import type { EApiRouteType } from "@enum/decorator/api/route-type.enum";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiSubscriberFunction, IApiSubscriberRoute } from "@interface/class/api/subscriber";
import type { IApiSubscriberFunctionExecutionContext } from "@interface/class/api/subscriber/function-execution-context.interface";
import type { IApiSubscriberRouteExecutionContext } from "@interface/class/api/subscriber/route-execution-context.interface";

import { CONTROLLER_API_DECORATOR_CONSTANT } from "@constant/decorator/api/controller.constant";
import { SERVICE_API_DECORATOR_CONSTANT } from "@constant/decorator/api/service.constant";
import { CapitalizeString } from "@utility/capitalize-string.utility";
import { LoggerUtility } from "@utility/logger.utility";

import { apiSubscriberRegistry } from "./registry.class";

const subscriberLogger: LoggerUtility = LoggerUtility.getLogger("ApiSubscriberExecutor");

export class ApiSubscriberExecutor {
	public static async executeFunctionSubscribers<E extends IApiBaseEntity, TResult, TInput>(constructor: new (...arguments_: Array<unknown>) => unknown, entity: E, functionType: EApiFunctionType, onType: EApiSubscriberOnType, context: IApiSubscriberFunctionExecutionContext<E, TResult, TInput>, error?: Error): Promise<TResult | undefined> {
		if (!Reflect.hasMetadata(SERVICE_API_DECORATOR_CONSTANT.OBSERVABLE_METADATA_KEY, constructor)) {
			return context.result as TResult;
		}

		const subscribers: Array<IApiSubscriberFunction<IApiBaseEntity>> = apiSubscriberRegistry.getFunctionSubscribers(entity.constructor.name);
		let result: TResult | undefined = context.result;

		for (const subscriber of subscribers) {
			const hookName: string = `on${onType}${CapitalizeString(functionType)}`;
			const hook: unknown = subscriber[hookName];

			if (typeof hook === "function") {
				subscriberLogger.verbose(`Executing function hook ${hookName} from ${subscriber.constructor.name} for entity ${entity.constructor.name}`);
				const hookResult: TResult | undefined = (await hook.call(subscriber, { ...context, result }, error)) as TResult | undefined;

				if (hookResult !== undefined) {
					result = hookResult as TResult;
				}
			}
		}

		return result;
	}

	public static async executeRouteSubscribers<E extends IApiBaseEntity, TResult, TInput>(constructor: new (...arguments_: Array<unknown>) => unknown, entity: E, routeType: EApiRouteType, onType: EApiSubscriberOnType, context: IApiSubscriberRouteExecutionContext<E, TResult, TInput>, error?: Error): Promise<TResult | undefined> {
		if (!Reflect.hasMetadata(CONTROLLER_API_DECORATOR_CONSTANT.OBSERVABLE_METADATA_KEY, constructor)) {
			return context.result as TResult;
		}

		const subscribers: Array<IApiSubscriberRoute<IApiBaseEntity>> = apiSubscriberRegistry.getRouteSubscribers(entity.constructor.name);
		let result: TResult | undefined = context.result;

		for (const subscriber of subscribers) {
			const hookName: string = `on${onType}${CapitalizeString(routeType)}`;
			const hook: unknown = subscriber[hookName];

			if (typeof hook === "function") {
				subscriberLogger.verbose(`Executing route hook ${hookName} from ${subscriber.constructor.name} for entity ${entity.constructor.name}`);
				const hookResult: TResult | undefined = (await hook.call(subscriber, { ...context, result }, error)) as TResult | undefined;

				if (hookResult !== undefined) {
					result = hookResult;
				}
			}
		}

		return result;
	}
}
