import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthorizationDecision } from "@interface/authorization";
import type { IApiAuthorizationRuleContext } from "@interface/authorization/rule/context.interface";
import type { TApiAuthorizationRuleTransformPayload } from "@type/class/api/authorization/rule/transform-payload.type";

/**
 * Applies decision result transforms sequentially to a response payload.
 * @template E - Entity type
 * @template R - Result payload type
 * @param {IApiAuthorizationDecision<E, R> | undefined} decision - Evaluated decision.
 * @param {R} result - Result to transform.
 * @returns {Promise<R>} Transformed payload.
 */
export async function AuthorizationDecisionApplyResult<E extends IApiBaseEntity, R extends TApiAuthorizationRuleTransformPayload<E>>(decision: IApiAuthorizationDecision<E, R> | undefined, result: R): Promise<R> {
	if (!decision?.transforms.length) {
		return result;
	}

	let transformedResult: R = result;

	const context: IApiAuthorizationRuleContext<E> = {
		resource: decision.resource,
		subject: decision.subject,
	};

	for (const transform of decision.transforms) {
		transformedResult = await transform(transformedResult, context);
	}

	return transformedResult;
}
