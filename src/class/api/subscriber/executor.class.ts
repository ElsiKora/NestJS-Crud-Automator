import { EApiSubscriberOnType } from "@enum/decorator/api/on-type.enum";
import { CONTROLLER_API_DECORATOR_CONSTANT } from "@constant/decorator/api/controller.constant";
import { SERVICE_API_DECORATOR_CONSTANT } from "@constant/decorator/api/service.constant";
import { EApiFunctionType } from "@enum/decorator/api/function";
import { EApiRouteType } from "@enum/decorator/api/route-type.enum";
import { IApiBaseEntity } from "@interface/api-base-entity.interface";
import { IApiSubscriberFunctionExecutionContext } from "@interface/class/api/subscriber/function-execution-context.interface";
import { IApiSubscriberRouteExecutionContext } from "@interface/class/api/subscriber/route-execution-context.interface";
import { apiSubscriberRegistry } from "./registry.class";
import { CapitalizeString } from "@utility/capitalize-string.utility";
import { LoggerUtility } from "@utility/logger.utility";

const subscriberLogger = LoggerUtility.getLogger("ApiSubscriberExecutor");

export class ApiSubscriberExecutor {
	public static async executeFunctionSubscribers<E extends IApiBaseEntity, TResult, TInput>(
        constructor: new (...args: Array<any>) => any,
        entity: E,
        functionType: EApiFunctionType,
        onType: EApiSubscriberOnType,
        context: IApiSubscriberFunctionExecutionContext<E, TResult, TInput>,
        error?: Error
    ): Promise<TResult | undefined> {
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
	}

    public static async executeRouteSubscribers<E extends IApiBaseEntity, TResult, TInput>(
        constructor: new (...args: Array<any>) => any,
        entity: E,
        routeType: EApiRouteType,
        onType: EApiSubscriberOnType,
        context: IApiSubscriberRouteExecutionContext<E, TResult, TInput>,
        error?: Error
    ): Promise<TResult | undefined> {
        if (!Reflect.hasMetadata(CONTROLLER_API_DECORATOR_CONSTANT.OBSERVABLE_METADATA_KEY, constructor)) {
            return context.result as TResult;
        }

        const subscribers = apiSubscriberRegistry.getRouteSubscribers(entity.constructor.name);
        let result = context.result;

        for (const subscriber of subscribers) {
            const hookName = `on${onType}${CapitalizeString(routeType)}`;
            const hook = subscriber[hookName];

            if (typeof hook === "function") {
                subscriberLogger.verbose(`Executing route hook ${hookName} from ${subscriber.constructor.name} for entity ${entity.constructor.name}`);
                const hookResult = await hook.call(subscriber, { ...context, result }, error);
                if (hookResult !== undefined) {
                    result = hookResult;
                }
            }
        }
        return result;
    }
}
