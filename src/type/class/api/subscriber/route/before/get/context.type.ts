import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthenticationRequest } from "@interface/api/authentication-request.interface";
import type { IApiSubscriberRouteExecutionContextData } from "@interface/class/api/subscriber/route/execution/context";
import type { IApiSubscriberRouteExecutionContext } from "@interface/class/api/subscriber/route/execution/context";

export type TApiSubscriberRouteBeforeGetContext<E extends IApiBaseEntity> = IApiSubscriberRouteExecutionContext<
	E,
	{
		authenticationRequest?: IApiAuthenticationRequest;
		headers: Record<string, string>;
		ip: string;
		parameters: Partial<E>;
	},
	IApiSubscriberRouteExecutionContextData<E, E>
>;
