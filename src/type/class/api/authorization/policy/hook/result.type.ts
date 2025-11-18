import type { EApiRouteType } from "@enum/decorator/api/route-type.enum";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiGetListResponseResult } from "@interface/decorator/api/get-list-response-result.interface";
import type { TApiAuthorizationRuleTransformPayload } from "@type/class/api/authorization/rule/transform-payload.type";

/**
 * Maps a policy hook/action to the payload type its transforms will receive.
 */
export type TApiAuthorizationPolicyHookResult<TAction extends string, E extends IApiBaseEntity> = TAction extends EApiRouteType.CREATE ? E : TAction extends EApiRouteType.GET ? E : TAction extends EApiRouteType.GET_LIST ? IApiGetListResponseResult<E> : TAction extends EApiRouteType.PARTIAL_UPDATE ? E : TAction extends EApiRouteType.UPDATE ? E : TAction extends EApiRouteType.DELETE ? undefined : TApiAuthorizationRuleTransformPayload<E>;
