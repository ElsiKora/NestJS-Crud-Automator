import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthenticationRequest } from "@interface/api/authentication-request.interface";
import type { IApiSubscriberRouteExecutionContextData } from "@interface/class/api/subscriber/route/execution/context-data.interface";
import type { IApiSubscriberRouteExecutionContext } from "@interface/class/api/subscriber/route/execution/context.interface";
import type { IApiGetListResponseResult } from "@interface/decorator/api";
import type { TApiControllerGetListQuery } from "@type/decorator/api/controller";

export type TApiSubscriberRouteBeforeGetListContext<E extends IApiBaseEntity> = IApiSubscriberRouteExecutionContext<
	E,
	{
		authenticationRequest?: IApiAuthenticationRequest;
		headers: Record<string, string>;
		ip: string;
		query: TApiControllerGetListQuery<E>;
	},
	IApiSubscriberRouteExecutionContextData<E, IApiGetListResponseResult<E>>
>;
