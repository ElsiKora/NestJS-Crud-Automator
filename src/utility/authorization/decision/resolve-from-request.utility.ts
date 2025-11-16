import type { IApiAuthenticationRequest } from "@interface/api-authentication-request.interface";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthorizationDecision } from "@interface/authorization/decision.interface";

import { AUTHORIZATION_DECISION_METADATA_CONSTANT } from "@constant/authorization";

/**
 * Extracts an authorization decision from the authentication request metadata stored on the HTTP request.
 * @template E - Entity type
 * @param {IApiAuthenticationRequest} [authenticationRequest] - Request object bound to the route handler.
 * @returns {IApiAuthorizationDecision<E> | undefined} Authorization decision if present.
 */
export function AuthorizationDecisionResolveFromRequest<E extends IApiBaseEntity>(authenticationRequest?: IApiAuthenticationRequest): IApiAuthorizationDecision<E> | undefined {
	if (!authenticationRequest) {
		return undefined;
	}

	const requestRecord: Record<string, unknown> = authenticationRequest as unknown as Record<string, unknown>;
	const decision: unknown = requestRecord[AUTHORIZATION_DECISION_METADATA_CONSTANT.REQUEST_KEY] ?? requestRecord.authorizationDecision;

	return decision as IApiAuthorizationDecision<E> | undefined;
}
