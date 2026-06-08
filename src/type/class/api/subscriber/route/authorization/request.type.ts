import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthenticationRequest } from "@interface/api/authentication-request.interface";
import type { IApiAuthorizationDecision } from "@interface/class/api/authorization";
import type { TApiAuthorizationRuleTransformPayload } from "@type/class/api/authorization/rule/transform-payload.type";

export type TApiSubscriberRouteAuthorizationRequest<E extends IApiBaseEntity, R = TApiAuthorizationRuleTransformPayload<E>> = {
	authorizationDecision: IApiAuthorizationDecision<E, R>;
} & Omit<IApiAuthenticationRequest, "authorizationDecision">;
