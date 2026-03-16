import type { IApiAuthorizationPolicy } from "@interface/class/api/authorization/policy/interface";
import type { IApiAuthorizationPrincipal } from "@interface/class/api/authorization/principal";
import type { IApiAuthorizationRule } from "@interface/class/api/authorization/rule/interface";

import { ApiAuthorizationEngine } from "@class/api/authorization/engine.class";
import { EApiAuthorizationDecisionType, EApiAuthorizationMode, EApiAuthorizationPrincipalType, EApiPolicyEffect } from "@enum/class/authorization";
import { describe, expect, it } from "vitest";

class TestEntity {
	public id?: string;
	public status?: string;
}

const principal: IApiAuthorizationPrincipal = {
	attributes: {},
	id: "user-1",
	roles: [],
	type: EApiAuthorizationPrincipalType.USER,
};

describe("ApiAuthorizationEngine", () => {
	it("returns deny decision when a deny rule matches", async () => {
		const engine = new ApiAuthorizationEngine();
		const allowRule: IApiAuthorizationRule<TestEntity, TestEntity> = {
			action: "get",
			condition: async () => true,
			effect: EApiPolicyEffect.ALLOW,
			policyId: "policy-allow",
			priority: 0,
		};
		const denyRule: IApiAuthorizationRule<TestEntity, TestEntity> = {
			action: "get",
			condition: async () => true,
			effect: EApiPolicyEffect.DENY,
			policyId: "policy-deny",
			priority: 1,
		};

		const policy: IApiAuthorizationPolicy<TestEntity, TestEntity> = {
			action: "get",
			entity: TestEntity,
			policyId: "test.authorization.policy",
			policyIds: ["policy-allow", "policy-deny"],
			rules: [allowRule, denyRule],
		};

		const decision = await engine.evaluate({
			action: "get",
			mode: EApiAuthorizationMode.HOOKS,
			permissions: [],
			policy,
			principal,
			resource: new TestEntity(),
			resourceType: "TestEntity",
		});

		expect(decision.effect).toBe(EApiPolicyEffect.DENY);
		expect(decision.appliedRules).toEqual([denyRule]);
		expect(decision.trace.decisionType).toBe(EApiAuthorizationDecisionType.EXPLICIT_DENY);
		expect(decision.transforms).toHaveLength(0);
	});

	it("merges scopes and collects transforms for allowed rules", async () => {
		const engine = new ApiAuthorizationEngine();
		const firstRule: IApiAuthorizationRule<TestEntity, { value: number }> = {
			action: "get",
			condition: async () => true,
			effect: EApiPolicyEffect.ALLOW,
			policyId: "policy-allow",
			priority: 0,
			scope: async () => ({
				where: {
					id: "1",
				},
			}),
			resultTransform: async (result) => ({ ...result, value: result.value + 1 }),
		};
		const secondRule: IApiAuthorizationRule<TestEntity, { value: number }> = {
			action: "get",
			condition: async () => true,
			effect: EApiPolicyEffect.ALLOW,
			policyId: "policy-allow-2",
			priority: 1,
			scope: async () => ({
				where: {
					status: "active",
				},
			}),
			resultTransform: async (result) => ({ ...result, value: result.value * 2 }),
		};

		const policy: IApiAuthorizationPolicy<TestEntity, { value: number }> = {
			action: "get",
			entity: TestEntity,
			policyId: "test.authorization.policy",
			policyIds: ["policy-allow", "policy-allow-2"],
			rules: [firstRule, secondRule],
		};

		const decision = await engine.evaluate({
			action: "get",
			mode: EApiAuthorizationMode.HOOKS,
			permissions: ["admin.item.read"],
			policy,
			principal,
			resource: new TestEntity(),
			resourceType: "TestEntity",
		});

		expect(decision.effect).toBe(EApiPolicyEffect.ALLOW);
		expect(decision.appliedRules).toHaveLength(2);
		expect(decision.trace.decisionType).toBe(EApiAuthorizationDecisionType.EXPLICIT_ALLOW);
		expect(decision.scope?.where).toEqual({
			id: "1",
			status: "active",
		});
		expect(decision.transforms).toHaveLength(2);
	});

	it("returns deny decision when no rule matches", async () => {
		const engine = new ApiAuthorizationEngine();
		const skippedRule: IApiAuthorizationRule<TestEntity, TestEntity> = {
			action: "get",
			condition: async () => false,
			effect: EApiPolicyEffect.ALLOW,
			policyId: "policy-skip",
			priority: 0,
		};

		const policy: IApiAuthorizationPolicy<TestEntity, TestEntity> = {
			action: "get",
			entity: TestEntity,
			policyId: "test.authorization.policy",
			policyIds: ["policy-skip"],
			rules: [skippedRule],
		};

		const decision = await engine.evaluate({
			action: "get",
			mode: EApiAuthorizationMode.HOOKS,
			permissions: [],
			policy,
			principal,
			resource: new TestEntity(),
			resourceType: "TestEntity",
		});

		expect(decision.effect).toBe(EApiPolicyEffect.DENY);
		expect(decision.appliedRules).toHaveLength(0);
		expect(decision.trace.decisionType).toBe(EApiAuthorizationDecisionType.IMPLICIT_DENY);
		expect(decision.scope).toBeUndefined();
	});
});
