import type { EApiControllerGetListQueryPaginationMode } from "@enum/decorator/api";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { TApiAuthorizationPolicyHookResult } from "@type/class/api/authorization/policy/hook/result.type";
import type { TApiAuthorizationPolicySubscriberRuleResult } from "@type/class/api/authorization/policy/subscriber";

export type TApiAuthorizationPolicyHookExecutionResult<E extends IApiBaseEntity, TAction extends string, M extends EApiControllerGetListQueryPaginationMode> = Promise<TApiAuthorizationPolicySubscriberRuleResult<E, TApiAuthorizationPolicyHookResult<TAction, E, M>>> | TApiAuthorizationPolicySubscriberRuleResult<E, TApiAuthorizationPolicyHookResult<TAction, E, M>>;
