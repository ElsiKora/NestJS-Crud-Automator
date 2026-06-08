import type { EApiRouteSubscriberAuthorizationExpectation } from "@enum/decorator/api";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthenticationRequest } from "@interface/api/authentication-request.interface";
import type { IApiSubscriberRouteExecutionContextData } from "@interface/class/api/subscriber/route/execution/context";
import type { IApiSubscriberRouteExecutionContext } from "@interface/class/api/subscriber/route/execution/context";
import type { TApiSubscriberRouteAuthorizationResult } from "@type/class/api/subscriber/route/authorization";
import type { DeepPartial } from "typeorm";

export type TApiSubscriberRouteBeforeCreateContext<E extends IApiBaseEntity, TAuthorizationExpectation extends EApiRouteSubscriberAuthorizationExpectation = EApiRouteSubscriberAuthorizationExpectation.OPTIONAL> = IApiSubscriberRouteExecutionContext<
	E,
	TApiSubscriberRouteAuthorizationResult<
		E,
		{
			authenticationRequest?: IApiAuthenticationRequest;
			body: DeepPartial<E>;
			headers: Record<string, string>;
			ip: string;
		},
		TAuthorizationExpectation,
		E
	>,
	IApiSubscriberRouteExecutionContextData<E, E>
>;
