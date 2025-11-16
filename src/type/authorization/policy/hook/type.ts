import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthorizationPolicySubscriberContext } from "@interface/authorization";

import type { TApiAuthorizationPolicySubscriberRuleResult } from "../policy-subscriber-rule-result.type";

export type TApiAuthorizationPolicyHook<E extends IApiBaseEntity> = (context: IApiAuthorizationPolicySubscriberContext<E>) => Promise<TApiAuthorizationPolicySubscriberRuleResult<E>> | TApiAuthorizationPolicySubscriberRuleResult<E>;
