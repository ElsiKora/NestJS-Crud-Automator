import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthenticationRequest } from "@interface/api/authentication-request.interface";
import type { IApiAuthorizationDecision } from "@interface/class/api/authorization/decision";
import type { ExecutionContext } from "@nestjs/common";
import type { TApiAuthorizationRuleTransformPayload } from "@type/class/api/authorization/rule/transform-payload.type";

import { createParamDecorator, ForbiddenException } from "@nestjs/common";
import { AuthorizationDecisionResolveFromRequest } from "@utility/authorization/decision/resolve-from-request.utility";

/**
 * Injects the authorization decision attached to the current HTTP request by the Automator authorization guard.
 * @template E - Authorized entity type.
 * @template R - Authorized route result payload type.
 * @returns {ParameterDecorator} Parameter decorator that fails closed when the request has no authorization decision.
 */
// Nest's ParameterDecorator cannot carry its factory output type, so these generics bind the factory contract used by each decorator application.
// eslint-disable-next-line @elsikora/typescript/no-unnecessary-type-parameters
export function ApiAuthorizationDecision<E extends IApiBaseEntity, R extends TApiAuthorizationRuleTransformPayload<E> = TApiAuthorizationRuleTransformPayload<E>>(): ParameterDecorator {
	return createParamDecorator<undefined, IApiAuthorizationDecision<E, R>>((_data: undefined, context: ExecutionContext): IApiAuthorizationDecision<E, R> => {
		const request: IApiAuthenticationRequest = context.switchToHttp().getRequest<IApiAuthenticationRequest>();
		const decision: IApiAuthorizationDecision<E, R> | undefined = AuthorizationDecisionResolveFromRequest<E, R>(request);

		if (!decision) {
			throw new ForbiddenException();
		}

		return decision;
	})();
}
