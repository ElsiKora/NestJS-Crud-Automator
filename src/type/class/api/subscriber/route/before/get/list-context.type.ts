import type { EApiControllerGetListQueryPaginationMode, EApiRouteSubscriberAuthorizationExpectation } from "@enum/decorator/api";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthenticationRequest } from "@interface/api/authentication-request.interface";
import type { IApiSubscriberRouteExecutionContextData } from "@interface/class/api/subscriber/route/execution/context";
import type { IApiSubscriberRouteExecutionContext } from "@interface/class/api/subscriber/route/execution/context";
import type { TApiSubscriberRouteAuthorizationResult } from "@type/class/api/subscriber/route/authorization";
import type { TApiControllerGetListQuery, TApiControllerGetListResponse } from "@type/decorator/api/controller";

export type TApiSubscriberRouteBeforeGetListContext<E extends IApiBaseEntity, TAuthorizationExpectation extends EApiRouteSubscriberAuthorizationExpectation = EApiRouteSubscriberAuthorizationExpectation.OPTIONAL, M extends EApiControllerGetListQueryPaginationMode = EApiControllerGetListQueryPaginationMode.PAGE> = IApiSubscriberRouteExecutionContext<
	E,
	TApiSubscriberRouteAuthorizationResult<
		E,
		{
			authenticationRequest?: IApiAuthenticationRequest;
			headers: Record<string, string>;
			ip: string;
			query: TApiControllerGetListQuery<E, M>;
		},
		TAuthorizationExpectation,
		TApiControllerGetListResponse<E, M>
	>,
	IApiSubscriberRouteExecutionContextData<E, TApiControllerGetListResponse<E, M>>
>;
