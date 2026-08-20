import type { EApiControllerGetListQueryPaginationMode } from "@enum/decorator/api";
import type { EApiRouteType } from "@enum/decorator/api/route";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthorizationPolicySubscriber, IApiAuthorizationPolicySubscriberContext, IApiAuthorizationPolicySubscriberRule } from "@interface/class/api/authorization/policy/subscriber";
import type { TApiAuthorizationPolicyHookResult } from "@type/class/api/authorization/policy/hook";
import type { TApiAuthorizationPolicyHookExecutionResult } from "@type/class/api/authorization/policy/hook/execution-result.type";
import type { TApiAuthorizationPolicySubscriberRuleResult } from "@type/class/api/authorization/policy/subscriber";

import { EApiPolicyOnType } from "@enum/class/authorization/policy/on-type.enum";
import { CamelCaseString } from "@utility/camel-case-string.utility";
import { LoggerUtility } from "@utility/logger.utility";

const policyExecutorLogger: LoggerUtility = LoggerUtility.getLogger("ApiAuthorizationPolicyExecutor");

export class ApiAuthorizationPolicyExecutor {
	public static async execute<E extends IApiBaseEntity, TAction extends string, M extends EApiControllerGetListQueryPaginationMode = EApiControllerGetListQueryPaginationMode.PAGE>(subscriber: IApiAuthorizationPolicySubscriber<E, M>, action: TAction, context: IApiAuthorizationPolicySubscriberContext<E, M>): Promise<Array<IApiAuthorizationPolicySubscriberRule<E, TApiAuthorizationPolicyHookResult<TAction, E, M>>>> {
		const routeType: EApiRouteType | undefined = context.routeType;

		if (routeType) {
			const hookName: string = `on${EApiPolicyOnType.BEFORE}${CamelCaseString(routeType)}`;
			const hook: unknown = Reflect.get(subscriber, hookName);

			if (typeof hook === "function") {
				policyExecutorLogger.verbose(`Executing authorization policy hook ${hookName} from ${subscriber.constructor.name} for action "${action}"`);
				const typedHook: (context: IApiAuthorizationPolicySubscriberContext<E, M>) => TApiAuthorizationPolicyHookExecutionResult<E, TAction, M> = hook as (context: IApiAuthorizationPolicySubscriberContext<E, M>) => TApiAuthorizationPolicyHookExecutionResult<E, TAction, M>;
				const result: TApiAuthorizationPolicyHookExecutionResult<E, TAction, M> = typedHook.call(subscriber, context);

				return this.normalizeRuleResult(await result);
			}

			return [];
		}

		if (typeof subscriber.getCustomActionRule !== "function") {
			return [];
		}

		const customActionHook: (actionValue: TAction, hookContext: IApiAuthorizationPolicySubscriberContext<E, M>) => TApiAuthorizationPolicyHookExecutionResult<E, TAction, M> = subscriber.getCustomActionRule.bind(subscriber);

		const customResult: TApiAuthorizationPolicyHookExecutionResult<E, TAction, M> = customActionHook(action, context);

		return this.normalizeRuleResult(await customResult);
	}

	private static normalizeRuleResult<E extends IApiBaseEntity, R>(result: TApiAuthorizationPolicySubscriberRuleResult<E, R>): Array<IApiAuthorizationPolicySubscriberRule<E, R>> {
		return result.filter((rule: IApiAuthorizationPolicySubscriberRule<E, R> | null | undefined): rule is IApiAuthorizationPolicySubscriberRule<E, R> => rule != null);
	}
}
