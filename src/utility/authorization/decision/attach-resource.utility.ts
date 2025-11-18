import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthorizationDecision } from "@interface/class/api/authorization/decision.interface";

/**
 * Mutates authorization decision to include the resolved entity resource.
 * @template E - Entity type
 * @template R - Result payload type
 * @param {IApiAuthorizationDecision<E, R> | undefined} decision - Decision to enrich.
 * @param {E | undefined} resource - Entity instance to attach.
 * @returns {IApiAuthorizationDecision<E, R> | undefined} Updated decision reference.
 */
export function AuthorizationDecisionAttachResource<E extends IApiBaseEntity, R>(decision: IApiAuthorizationDecision<E, R> | undefined, resource: E | undefined): IApiAuthorizationDecision<E, R> | undefined {
	if (!decision || resource === undefined) {
		return decision;
	}

	decision.resource = resource;

	return decision;
}
