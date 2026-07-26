import type { EApiRouteSubscriberAuthorizationExpectation } from "@enum/decorator/api";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthenticationRequest } from "@interface/api/authentication-request.interface";
import type { TApiAuthorizationRuleTransformPayload } from "@type/class/api/authorization/rule/transform-payload.type";
import type { TApiSubscriberRouteAuthorizationRequest } from "@type/class/api/subscriber/route/authorization/request.type";

export type TApiSubscriberRouteAuthorizationResult<E extends IApiBaseEntity, Result extends { authenticationRequest?: IApiAuthenticationRequest }, TAuthorizationExpectation extends EApiRouteSubscriberAuthorizationExpectation = EApiRouteSubscriberAuthorizationExpectation.OPTIONAL, R = TApiAuthorizationRuleTransformPayload<E>> = [TAuthorizationExpectation] extends [EApiRouteSubscriberAuthorizationExpectation.REQUIRED]
	? { authenticationRequest: TApiSubscriberRouteAuthorizationRequest<E, R> } & Omit<Result, "authenticationRequest">
	: Result;
