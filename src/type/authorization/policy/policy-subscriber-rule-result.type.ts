import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthorizationPolicySubscriberRule } from "@interface/authorization/policy/subscriber/rule.interface";

export type TApiAuthorizationPolicySubscriberRuleResult<E extends IApiBaseEntity> = Array<IApiAuthorizationPolicySubscriberRule<E>> | IApiAuthorizationPolicySubscriberRule<E> | undefined;
