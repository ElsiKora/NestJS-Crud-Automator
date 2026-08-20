import type { EApiControllerGetListQueryPaginationMode } from "@enum/decorator/api";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthorizationPolicySubscriberContext } from "@interface/class/api/authorization";
import type { TApiAuthorizationPolicyHookResult } from "@type/class/api/authorization/policy/hook/result.type";
import type { TApiAuthorizationPolicySubscriberRuleResult } from "@type/class/api/authorization/policy/subscriber";

export type TApiAuthorizationPolicyHook<E extends IApiBaseEntity, TAction extends string, M extends EApiControllerGetListQueryPaginationMode = EApiControllerGetListQueryPaginationMode.PAGE> = (context: IApiAuthorizationPolicySubscriberContext<E, M>) => Promise<TApiAuthorizationPolicySubscriberRuleResult<E, TApiAuthorizationPolicyHookResult<TAction, E, M>>> | TApiAuthorizationPolicySubscriberRuleResult<E, TApiAuthorizationPolicyHookResult<TAction, E, M>>;
