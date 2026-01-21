import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { TApiAuthorizationPolicyHookResult } from "@type/class/api/authorization/policy/hook";
import type { TApiAuthorizationPolicySubscriberRuleResult } from "@type/class/api/authorization/policy/policy-subscriber-rule-result.type";

export type TApiAuthorizationPolicyCustomActionResult<E extends IApiBaseEntity, TAction extends string = string> = TApiAuthorizationPolicySubscriberRuleResult<E, TApiAuthorizationPolicyHookResult<TAction, E>>;
