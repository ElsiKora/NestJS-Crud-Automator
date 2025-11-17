import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthorizationPolicySubscriberRule } from "@interface/authorization/policy/subscriber/rule.interface";

export type TApiAuthorizationPolicySubscriberRuleResult<E extends IApiBaseEntity, R> = Array<IApiAuthorizationPolicySubscriberRule<E, R>> | IApiAuthorizationPolicySubscriberRule<E, R> | undefined;
