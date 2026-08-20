import type { EApiControllerGetListQueryPaginationMode } from "@enum/decorator/api";
import type { EApiRouteType } from "@enum/decorator/api/route";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { TApiAuthorizationRuleTransformPayload } from "@type/class/api/authorization/rule/transform-payload.type";
import type { TApiControllerGetListResponse } from "@type/decorator/api/controller";

/**
 * Maps a policy hook/action to the payload type its transforms will receive.
 */
export type TApiAuthorizationPolicyHookResult<TAction extends string, E extends IApiBaseEntity, M extends EApiControllerGetListQueryPaginationMode = EApiControllerGetListQueryPaginationMode.PAGE> = TAction extends EApiRouteType.CREATE
	? E
	: TAction extends EApiRouteType.GET
		? E
		: TAction extends EApiRouteType.GET_LIST
			? TApiControllerGetListResponse<E, M>
			: TAction extends EApiRouteType.PARTIAL_UPDATE
				? E
				: TAction extends EApiRouteType.UPDATE
					? E
					: TAction extends EApiRouteType.DELETE
						? undefined
						: TApiAuthorizationRuleTransformPayload<E>;
