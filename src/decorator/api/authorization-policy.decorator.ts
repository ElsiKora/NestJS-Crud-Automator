import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthorizationPolicySubscriberProperties } from "@interface/class/api/authorization/policy/subscriber/properties.interface";

import { AUTHORIZATION_POLICY_DECORATOR_CONSTANT } from "@constant/class/authorization/policy-decorator.constant";

/**
 * Decorator that registers a class as an authorization policy for a specific entity.
 * @template E - Entity type extending IApiBaseEntity
 * @param {IApiAuthorizationPolicySubscriberProperties<E>} properties - Policy properties.
 * @returns {ClassDecorator} Class decorator registering metadata for discovery.
 * @see {@link https://elsikora.com/docs/nestjs-crud-automator/api-reference/decorators/api-authorization/api-authorization-policy | API Reference - ApiAuthorizationPolicy}
 */
export function ApiAuthorizationPolicy<E extends IApiBaseEntity>(properties: IApiAuthorizationPolicySubscriberProperties<E>): ClassDecorator {
	const normalizedPolicyId: string = properties.policyId ?? `${properties.entity.name?.toLowerCase() ?? "unknown"}${AUTHORIZATION_POLICY_DECORATOR_CONSTANT.DEFAULT_POLICY_ID_SUFFIX}`;

	const metadata: IApiAuthorizationPolicySubscriberProperties<E> = {
		cache: properties.cache,
		description: properties.description,
		entity: properties.entity,
		policyId: normalizedPolicyId,
		priority: properties.priority ?? 0,
	};

	return (target: object) => {
		Reflect.defineMetadata(AUTHORIZATION_POLICY_DECORATOR_CONSTANT.METADATA_KEY, metadata, target);
	};
}
