import type { EApiControllerGetListQueryPaginationMode } from "@enum/decorator/api";
import type { EApiRouteType } from "@enum/decorator/api/route";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { TApiAuthorizationPolicyHookResult } from "@type/class/api/authorization/policy/hook";
import type { TApiAuthorizationPolicySubscriberRuleResult } from "@type/class/api/authorization/policy/subscriber";

export type TApiAuthorizationPolicyBeforeGetListResult<E extends IApiBaseEntity, M extends EApiControllerGetListQueryPaginationMode = EApiControllerGetListQueryPaginationMode.PAGE> = TApiAuthorizationPolicySubscriberRuleResult<E, TApiAuthorizationPolicyHookResult<EApiRouteType.GET_LIST, E, M>>;
