import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthorizationPolicySubscriberContext } from "@interface/class/api/authorization";
import type { TApiAuthorizationPolicyHookResult } from "@type/class/api/authorization/policy/hook/result.type";
import type { TApiAuthorizationPolicySubscriberRuleResult } from "@type/class/api/authorization/policy/subscriber";

export type TApiAuthorizationPolicyHook<E extends IApiBaseEntity, TAction extends string> = (context: IApiAuthorizationPolicySubscriberContext<E>) => Promise<TApiAuthorizationPolicySubscriberRuleResult<E, TApiAuthorizationPolicyHookResult<TAction, E>>> | TApiAuthorizationPolicySubscriberRuleResult<E, TApiAuthorizationPolicyHookResult<TAction, E>>;
