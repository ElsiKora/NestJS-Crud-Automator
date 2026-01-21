import type { EApiRouteType } from "@enum/decorator/api/route-type.enum";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { TApiAuthorizationPolicyHookResult } from "@type/class/api/authorization/policy/hook";
import type { TApiAuthorizationPolicySubscriberRuleResult } from "@type/class/api/authorization/policy/policy-subscriber-rule-result.type";

export type TApiAuthorizationPolicyBeforeCreateResult<E extends IApiBaseEntity> = TApiAuthorizationPolicySubscriberRuleResult<E, TApiAuthorizationPolicyHookResult<EApiRouteType.CREATE, E>>;
