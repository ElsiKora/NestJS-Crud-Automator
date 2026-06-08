import type { EApiRouteSubscriberAuthorizationExpectation } from "@enum/decorator/api";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthenticationRequest } from "@interface/api/authentication-request.interface";
import type { IApiSubscriberRouteExecutionContextData } from "@interface/class/api/subscriber/route/execution/context";
import type { IApiSubscriberRouteExecutionContext } from "@interface/class/api/subscriber/route/execution/context";
import type { TApiSubscriberRouteAuthorizationResult } from "@type/class/api/subscriber/route/authorization";

export type TApiSubscriberRouteBeforeGetContext<E extends IApiBaseEntity, TAuthorizationExpectation extends EApiRouteSubscriberAuthorizationExpectation = EApiRouteSubscriberAuthorizationExpectation.OPTIONAL> = IApiSubscriberRouteExecutionContext<
	E,
	TApiSubscriberRouteAuthorizationResult<
		E,
		{
			authenticationRequest?: IApiAuthenticationRequest;
			headers: Record<string, string>;
			ip: string;
			parameters: Partial<E>;
		},
		TAuthorizationExpectation,
		E
	>,
	IApiSubscriberRouteExecutionContextData<E, E>
>;
