import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthorizationPolicySubscriberContext } from "@interface/authorization/policy/subscriber/context.interface";
import type { IApiAuthorizationPolicySubscriberRule } from "@interface/authorization/policy/subscriber/rule.interface";
import type { TApiAuthorizationPolicySubscriberRuleResult } from "@type/authorization/policy/policy-subscriber-rule-result.type";

export interface IApiAuthorizationPolicySubscriber<E extends IApiBaseEntity> {
	getCustomActionRule?(action: string, context: IApiAuthorizationPolicySubscriberContext<E>): Promise<TApiAuthorizationPolicySubscriberRuleResult<E>> | TApiAuthorizationPolicySubscriberRuleResult<E>;
	getRulesForAction(action: string, context: IApiAuthorizationPolicySubscriberContext<E>): Promise<Array<IApiAuthorizationPolicySubscriberRule<E>>>;
	onBeforeCreate?(context: IApiAuthorizationPolicySubscriberContext<E>): Promise<TApiAuthorizationPolicySubscriberRuleResult<E>> | TApiAuthorizationPolicySubscriberRuleResult<E>;
	onBeforeDelete?(context: IApiAuthorizationPolicySubscriberContext<E>): Promise<TApiAuthorizationPolicySubscriberRuleResult<E>> | TApiAuthorizationPolicySubscriberRuleResult<E>;
	onBeforeGet?(context: IApiAuthorizationPolicySubscriberContext<E>): Promise<TApiAuthorizationPolicySubscriberRuleResult<E>> | TApiAuthorizationPolicySubscriberRuleResult<E>;
	onBeforeGetList?(context: IApiAuthorizationPolicySubscriberContext<E>): Promise<TApiAuthorizationPolicySubscriberRuleResult<E>> | TApiAuthorizationPolicySubscriberRuleResult<E>;
	onBeforePartialUpdate?(context: IApiAuthorizationPolicySubscriberContext<E>): Promise<TApiAuthorizationPolicySubscriberRuleResult<E>> | TApiAuthorizationPolicySubscriberRuleResult<E>;
	onBeforeUpdate?(context: IApiAuthorizationPolicySubscriberContext<E>): Promise<TApiAuthorizationPolicySubscriberRuleResult<E>> | TApiAuthorizationPolicySubscriberRuleResult<E>;
}
