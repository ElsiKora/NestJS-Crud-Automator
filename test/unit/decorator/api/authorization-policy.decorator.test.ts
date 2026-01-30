import "reflect-metadata";

import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthorizationPolicySubscriberProperties } from "@interface/class/api/authorization/policy/subscriber/properties.interface";

import { AUTHORIZATION_POLICY_DECORATOR_CONSTANT } from "@constant/class/authorization/policy-decorator.constant";
import { ApiAuthorizationPolicy } from "@decorator/api/authorization-policy.decorator";
import { describe, expect, it } from "vitest";

class PolicyEntity implements IApiBaseEntity {}

describe("ApiAuthorizationPolicy", () => {
	it("registers metadata with default policy id and priority", () => {
		@ApiAuthorizationPolicy({ entity: PolicyEntity })
		class DefaultPolicy {}

		const metadata = Reflect.getMetadata(AUTHORIZATION_POLICY_DECORATOR_CONSTANT.METADATA_KEY, DefaultPolicy) as IApiAuthorizationPolicySubscriberProperties<PolicyEntity>;

		expect(metadata.policyId).toBe(`${PolicyEntity.name.toLowerCase()}${AUTHORIZATION_POLICY_DECORATOR_CONSTANT.DEFAULT_POLICY_ID_SUFFIX}`);
		expect(metadata.priority).toBe(0);
		expect(metadata.entity).toBe(PolicyEntity);
	});

	it("uses provided policy properties", () => {
		@ApiAuthorizationPolicy({
			cache: { isEnabled: true, ttlMs: 2500 },
			description: "custom policy",
			entity: PolicyEntity,
			policyId: "custom.policy",
			priority: 5,
		})
		class CustomPolicy {}

		const metadata = Reflect.getMetadata(AUTHORIZATION_POLICY_DECORATOR_CONSTANT.METADATA_KEY, CustomPolicy) as IApiAuthorizationPolicySubscriberProperties<PolicyEntity>;

		expect(metadata).toMatchObject({
			cache: { isEnabled: true, ttlMs: 2500 },
			description: "custom policy",
			entity: PolicyEntity,
			policyId: "custom.policy",
			priority: 5,
		});
	});

	it("falls back to unknown when entity name is missing", () => {
		const entity = { name: undefined } as unknown as new () => IApiBaseEntity;

		@ApiAuthorizationPolicy({ entity })
		class AnonymousPolicy {}

		const metadata = Reflect.getMetadata(AUTHORIZATION_POLICY_DECORATOR_CONSTANT.METADATA_KEY, AnonymousPolicy) as IApiAuthorizationPolicySubscriberProperties<IApiBaseEntity>;

		expect(metadata.policyId).toBe(`unknown${AUTHORIZATION_POLICY_DECORATOR_CONSTANT.DEFAULT_POLICY_ID_SUFFIX}`);
	});
});
