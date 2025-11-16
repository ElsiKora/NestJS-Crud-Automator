import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthorizationDecision } from "@interface/authorization";
import type { IApiAuthorizationRuleContext } from "@interface/authorization/rule/context.interface";
import type { TApiAuthorizationRuleTransformPayload } from "@type/authorization/rule/transform-payload.type";

/**
 * Applies decision result transforms sequentially to a response payload.
 * @template E - Entity type
 * @param {IApiAuthorizationDecision<E> | undefined} decision - Evaluated decision.
 * @param {TApiAuthorizationRuleTransformPayload<E>} result - Result to transform.
 * @returns {Promise<TApiAuthorizationRuleTransformPayload<E>>} Transformed payload.
 */
export async function AuthorizationDecisionApplyResult<E extends IApiBaseEntity>(decision: IApiAuthorizationDecision<E> | undefined, result: TApiAuthorizationRuleTransformPayload<E>): Promise<TApiAuthorizationRuleTransformPayload<E>> {
	if (!decision?.transforms.length) {
		return result;
	}

	let transformedResult: TApiAuthorizationRuleTransformPayload<E> = result;

	const context: IApiAuthorizationRuleContext<E> = {
		resource: decision.resource,
		subject: decision.subject,
	};

	for (const transform of decision.transforms) {
		transformedResult = await transform(transformedResult, context);
	}

	return transformedResult;
}
