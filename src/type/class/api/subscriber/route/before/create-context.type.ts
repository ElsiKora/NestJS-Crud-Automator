import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthenticationRequest } from "@interface/api/authentication-request.interface";
import type { IApiSubscriberRouteExecutionContextData } from "@interface/class/api/subscriber/route/execution/context-data.interface";
import type { IApiSubscriberRouteExecutionContext } from "@interface/class/api/subscriber/route/execution/context.interface";
import type { DeepPartial } from "typeorm";

export type TApiSubscriberRouteBeforeCreateContext<E extends IApiBaseEntity> = IApiSubscriberRouteExecutionContext<
	E,
	{
		authenticationRequest?: IApiAuthenticationRequest;
		body: DeepPartial<E>;
		headers: Record<string, string>;
		ip: string;
	},
	IApiSubscriberRouteExecutionContextData<E, E>
>;
