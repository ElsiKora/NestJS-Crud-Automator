import type { EApiControllerGetListQueryPaginationMode } from "@enum/decorator/api";
import type { EApiRouteType } from "@enum/decorator/api/route";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthorizationPolicySubscriberContext } from "@interface/class/api/authorization/policy/subscriber/context";
import type { IApiSubscriber } from "@interface/class/api/subscriber/interface";
import type { TApiAuthorizationPolicyHookResult } from "@type/class/api/authorization/policy/hook";
import type { TApiAuthorizationPolicySubscriberRuleResult } from "@type/class/api/authorization/policy/subscriber";

export interface IApiAuthorizationPolicySubscriber<E extends IApiBaseEntity, M extends EApiControllerGetListQueryPaginationMode = EApiControllerGetListQueryPaginationMode.PAGE> extends IApiSubscriber {
	getCustomActionRule?<TAction extends string>(action: TAction, context: IApiAuthorizationPolicySubscriberContext<E, M>): Promise<TApiAuthorizationPolicySubscriberRuleResult<E, TApiAuthorizationPolicyHookResult<TAction, E, M>>> | TApiAuthorizationPolicySubscriberRuleResult<E, TApiAuthorizationPolicyHookResult<TAction, E, M>>;
	onBeforeCreate?(context: IApiAuthorizationPolicySubscriberContext<E, M>): Promise<TApiAuthorizationPolicySubscriberRuleResult<E, TApiAuthorizationPolicyHookResult<EApiRouteType.CREATE, E, M>>> | TApiAuthorizationPolicySubscriberRuleResult<E, TApiAuthorizationPolicyHookResult<EApiRouteType.CREATE, E, M>>;
	onBeforeDelete?(context: IApiAuthorizationPolicySubscriberContext<E, M>): Promise<TApiAuthorizationPolicySubscriberRuleResult<E, TApiAuthorizationPolicyHookResult<EApiRouteType.DELETE, E, M>>> | TApiAuthorizationPolicySubscriberRuleResult<E, TApiAuthorizationPolicyHookResult<EApiRouteType.DELETE, E, M>>;
	onBeforeGet?(context: IApiAuthorizationPolicySubscriberContext<E, M>): Promise<TApiAuthorizationPolicySubscriberRuleResult<E, TApiAuthorizationPolicyHookResult<EApiRouteType.GET, E, M>>> | TApiAuthorizationPolicySubscriberRuleResult<E, TApiAuthorizationPolicyHookResult<EApiRouteType.GET, E, M>>;
	onBeforeGetList?(context: IApiAuthorizationPolicySubscriberContext<E, M>): Promise<TApiAuthorizationPolicySubscriberRuleResult<E, TApiAuthorizationPolicyHookResult<EApiRouteType.GET_LIST, E, M>>> | TApiAuthorizationPolicySubscriberRuleResult<E, TApiAuthorizationPolicyHookResult<EApiRouteType.GET_LIST, E, M>>;
	onBeforePartialUpdate?(context: IApiAuthorizationPolicySubscriberContext<E, M>): Promise<TApiAuthorizationPolicySubscriberRuleResult<E, TApiAuthorizationPolicyHookResult<EApiRouteType.PARTIAL_UPDATE, E, M>>> | TApiAuthorizationPolicySubscriberRuleResult<E, TApiAuthorizationPolicyHookResult<EApiRouteType.PARTIAL_UPDATE, E, M>>;
	onBeforeUpdate?(context: IApiAuthorizationPolicySubscriberContext<E, M>): Promise<TApiAuthorizationPolicySubscriberRuleResult<E, TApiAuthorizationPolicyHookResult<EApiRouteType.UPDATE, E, M>>> | TApiAuthorizationPolicySubscriberRuleResult<E, TApiAuthorizationPolicyHookResult<EApiRouteType.UPDATE, E, M>>;
}
