import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthorizationPolicySubscriber, IApiAuthorizationPolicySubscriberContext, IApiAuthorizationPolicySubscriberRule } from "@interface/class/api/authorization/policy/subscriber";
import type { TApiAuthorizationPolicyHookResult } from "@type/class/api/authorization/policy/hook";
import type { TApiAuthorizationPolicySubscriberRuleResult } from "@type/class/api/authorization/policy/policy-subscriber-rule-result.type";

import { EApiAuthorizationPolicyOnType } from "@enum/class/authorization/policy-on-type.enum";
import { EApiRouteType } from "@enum/decorator/api/route-type.enum";
import { CapitalizeString } from "@utility/capitalize-string.utility";
import { LoggerUtility } from "@utility/logger.utility";

const policyExecutorLogger: LoggerUtility = LoggerUtility.getLogger("ApiAuthorizationPolicyExecutor");

type TApiAuthorizationPolicyHookExecutionResult<E extends IApiBaseEntity, TAction extends string> = Promise<TApiAuthorizationPolicySubscriberRuleResult<E, TApiAuthorizationPolicyHookResult<TAction, E>>> | TApiAuthorizationPolicySubscriberRuleResult<E, TApiAuthorizationPolicyHookResult<TAction, E>>;

export class ApiAuthorizationPolicyExecutor {
	public static async execute<E extends IApiBaseEntity, TAction extends string>(subscriber: IApiAuthorizationPolicySubscriber<E>, action: TAction, context: IApiAuthorizationPolicySubscriberContext<E>): Promise<Array<IApiAuthorizationPolicySubscriberRule<E, TApiAuthorizationPolicyHookResult<TAction, E>>>> {
		const routeType: EApiRouteType | undefined = context.routeType ?? this.resolveRouteType(action);

		if (routeType) {
			const hookName: string = `on${EApiAuthorizationPolicyOnType.BEFORE}${CapitalizeString(routeType)}`;
			const hook: unknown = subscriber[hookName as keyof IApiAuthorizationPolicySubscriber<E>];

			if (typeof hook === "function") {
				policyExecutorLogger.verbose(`Executing authorization policy hook ${hookName} from ${subscriber.constructor.name} for action "${action}"`);
				const typedHook: (context: IApiAuthorizationPolicySubscriberContext<E>) => TApiAuthorizationPolicyHookExecutionResult<E, TAction> = hook as (context: IApiAuthorizationPolicySubscriberContext<E>) => TApiAuthorizationPolicyHookExecutionResult<E, TAction>;
				const result: TApiAuthorizationPolicyHookExecutionResult<E, TAction> = typedHook.call(subscriber, context);

				return this.normalizeRuleResult(await result);
			}

			return [];
		}

		if (typeof subscriber.getCustomActionRule !== "function") {
			return [];
		}

		const customActionHook: (actionValue: TAction, hookContext: IApiAuthorizationPolicySubscriberContext<E>) => TApiAuthorizationPolicyHookExecutionResult<E, TAction> = subscriber.getCustomActionRule.bind(subscriber) as (actionValue: TAction, hookContext: IApiAuthorizationPolicySubscriberContext<E>) => TApiAuthorizationPolicyHookExecutionResult<E, TAction>;

		const customResult: TApiAuthorizationPolicyHookExecutionResult<E, TAction> = customActionHook(action, context);

		return this.normalizeRuleResult(await customResult);
	}

	private static normalizeRuleResult<E extends IApiBaseEntity, R>(result: TApiAuthorizationPolicySubscriberRuleResult<E, R>): Array<IApiAuthorizationPolicySubscriberRule<E, R>> {
		if (Array.isArray(result)) {
			return result.filter((rule: IApiAuthorizationPolicySubscriberRule<E, R> | null | undefined): rule is IApiAuthorizationPolicySubscriberRule<E, R> => rule != null);
		}

		return result ? [result] : [];
	}

	private static resolveRouteType(action: string): EApiRouteType | undefined {
		const routeTypes: Array<string> = Object.values(EApiRouteType) as Array<string>;

		return routeTypes.find((routeType: string) => routeType === action) as EApiRouteType | undefined;
	}
}
