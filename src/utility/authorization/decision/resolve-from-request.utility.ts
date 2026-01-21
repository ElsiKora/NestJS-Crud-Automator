import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthenticationRequest } from "@interface/api/authentication-request.interface";
import type { IApiAuthorizationDecision } from "@interface/class/api/authorization/decision.interface";
import type { TApiAuthorizationRuleTransformPayload } from "@type/class/api/authorization/rule/transform-payload.type";

import { AUTHORIZATION_DECISION_METADATA_CONSTANT } from "@constant/class/authorization";

/**
 * Extracts an authorization decision from the authentication request metadata stored on the HTTP request.
 * @template E - Entity type
 * @template R - Result payload type
 * @param {IApiAuthenticationRequest} [authenticationRequest] - Request object bound to the route handler.
 * @returns {IApiAuthorizationDecision<E, R> | undefined} Authorization decision if present.
 */
export function AuthorizationDecisionResolveFromRequest<E extends IApiBaseEntity, R extends TApiAuthorizationRuleTransformPayload<E> = TApiAuthorizationRuleTransformPayload<E>>(authenticationRequest?: IApiAuthenticationRequest): IApiAuthorizationDecision<E, R> | undefined {
	if (!authenticationRequest) {
		return undefined;
	}

	const requestRecord: Record<string, unknown> = authenticationRequest as unknown as Record<string, unknown>;
	const decision: unknown = requestRecord[AUTHORIZATION_DECISION_METADATA_CONSTANT.REQUEST_KEY] ?? requestRecord.authorizationDecision;

	return decision as IApiAuthorizationDecision<E, R> | undefined;
}
