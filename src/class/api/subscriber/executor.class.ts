import type { EApiFunctionType } from "@enum/decorator/api/function";
import type { EApiSubscriberOnType } from "@enum/decorator/api/on-type.enum";
import type { EApiRouteType } from "@enum/decorator/api/route-type.enum";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiSubscriberFunctionExecutionContext } from "@interface/class/api/subscriber/function-execution-context.interface";
import type { IApiSubscriberRouteExecutionContext } from "@interface/class/api/subscriber/route-execution-context.interface";

import { CONTROLLER_API_DECORATOR_CONSTANT } from "@constant/decorator/api";
import { SERVICE_API_DECORATOR_CONSTANT } from "@constant/decorator/api/service.constant";
import { CapitalizeString } from "@utility/capitalize-string.utility";
import { LoggerUtility } from "@utility/logger.utility";

import { apiSubscriberRegistry } from "./registry.class";

const subscriberLogger = LoggerUtility.getLogger("ApiSubscriberExecutor");

export const ApiSubscriberExecutor = {
	async executeFunctionSubscribers<E extends IApiBaseEntity, TResult, TInput>(constructor: new (...arguments_: Array<any>) => any, entity: E, functionType: EApiFunctionType, onType: EApiSubscriberOnType, context: IApiSubscriberFunctionExecutionContext<E, TResult, TInput>, error?: Error): Promise<TResult | undefined> {
		if (!Reflect.hasMetadata(SERVICE_API_DECORATOR_CONSTANT.OBSERVABLE_METADATA_KEY, constructor)) {
			return context.result as TResult;
		}

		const subscribers = apiSubscriberRegistry.getFunctionSubscribers(entity.constructor.name);
		let result = context.result;

		for (const subscriber of subscribers) {
			const hookName = `on${onType}${CapitalizeString(functionType)}`;
			const hook = subscriber[hookName];

			if (typeof hook === "function") {
				subscriberLogger.verbose(`Executing function hook ${hookName} from ${subscriber.constructor.name} for entity ${entity.constructor.name}`);
				const hookResult = await hook.call(subscriber, { ...context, result }, error);

				if (hookResult !== undefined) {
					result = hookResult;
				}
			}
		}

		return result;
	},

	async executeRouteSubscribers<E extends IApiBaseEntity, TResult, TInput>(constructor: new (...arguments_: Array<any>) => any, entity: E, routeType: EApiRouteType, onType: EApiSubscriberOnType, context: IApiSubscriberRouteExecutionContext<E, TResult, TInput>, error?: Error): Promise<TResult | undefined> {
		if (!Reflect.hasMetadata(CONTROLLER_API_DECORATOR_CONSTANT.OBSERVABLE_METADATA_KEY, constructor)) {
			return context.result as TResult;
		}

		const subscribers = apiSubscriberRegistry.getRouteSubscribers(entity.constructor.name);
		let result = context.result;

		for (const subscriber of subscribers) {
			const hookName = `on${onType}${CapitalizeString(routeType)}`;
			const hook = subscriber[hookName];

			console.log("Chlenix1");
			console.log("hook", hook);

			if (typeof hook === "function") {
				console.log("Chlenix2");
				subscriberLogger.verbose(`Executing route hook ${hookName} from ${subscriber.constructor.name} for entity ${entity.constructor.name}`);
				const hookResult = await hook.call(subscriber, { ...context, result }, error);

				if (hookResult !== undefined) {
					result = hookResult;
				}
			} else {
				console.log("Chlenix3");
			}
		}

		return result;
	},
};
