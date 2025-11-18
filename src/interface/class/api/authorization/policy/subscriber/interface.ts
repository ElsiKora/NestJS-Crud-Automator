import type { EApiRouteType } from "@enum/decorator/api/route-type.enum";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthorizationPolicySubscriberContext } from "@interface/class/api/authorization/policy/subscriber/context.interface";
import type { TApiAuthorizationPolicyHookResult } from "@type/class/api/authorization/policy/hook";
import type { TApiAuthorizationPolicySubscriberRuleResult } from "@type/class/api/authorization/policy/policy-subscriber-rule-result.type";

export interface IApiAuthorizationPolicySubscriber<E extends IApiBaseEntity> {
	getCustomActionRule?<TAction extends string>(action: TAction, context: IApiAuthorizationPolicySubscriberContext<E>): Promise<TApiAuthorizationPolicySubscriberRuleResult<E, TApiAuthorizationPolicyHookResult<TAction, E>>> | TApiAuthorizationPolicySubscriberRuleResult<E, TApiAuthorizationPolicyHookResult<TAction, E>>;
	onBeforeCreate?(context: IApiAuthorizationPolicySubscriberContext<E>): Promise<TApiAuthorizationPolicySubscriberRuleResult<E, TApiAuthorizationPolicyHookResult<EApiRouteType.CREATE, E>>> | TApiAuthorizationPolicySubscriberRuleResult<E, TApiAuthorizationPolicyHookResult<EApiRouteType.CREATE, E>>;
	onBeforeDelete?(context: IApiAuthorizationPolicySubscriberContext<E>): Promise<TApiAuthorizationPolicySubscriberRuleResult<E, TApiAuthorizationPolicyHookResult<EApiRouteType.DELETE, E>>> | TApiAuthorizationPolicySubscriberRuleResult<E, TApiAuthorizationPolicyHookResult<EApiRouteType.DELETE, E>>;
	onBeforeGet?(context: IApiAuthorizationPolicySubscriberContext<E>): Promise<TApiAuthorizationPolicySubscriberRuleResult<E, TApiAuthorizationPolicyHookResult<EApiRouteType.GET, E>>> | TApiAuthorizationPolicySubscriberRuleResult<E, TApiAuthorizationPolicyHookResult<EApiRouteType.GET, E>>;
	onBeforeGetList?(context: IApiAuthorizationPolicySubscriberContext<E>): Promise<TApiAuthorizationPolicySubscriberRuleResult<E, TApiAuthorizationPolicyHookResult<EApiRouteType.GET_LIST, E>>> | TApiAuthorizationPolicySubscriberRuleResult<E, TApiAuthorizationPolicyHookResult<EApiRouteType.GET_LIST, E>>;
	onBeforePartialUpdate?(context: IApiAuthorizationPolicySubscriberContext<E>): Promise<TApiAuthorizationPolicySubscriberRuleResult<E, TApiAuthorizationPolicyHookResult<EApiRouteType.PARTIAL_UPDATE, E>>> | TApiAuthorizationPolicySubscriberRuleResult<E, TApiAuthorizationPolicyHookResult<EApiRouteType.PARTIAL_UPDATE, E>>;
	onBeforeUpdate?(context: IApiAuthorizationPolicySubscriberContext<E>): Promise<TApiAuthorizationPolicySubscriberRuleResult<E, TApiAuthorizationPolicyHookResult<EApiRouteType.UPDATE, E>>> | TApiAuthorizationPolicySubscriberRuleResult<E, TApiAuthorizationPolicyHookResult<EApiRouteType.UPDATE, E>>;
}
