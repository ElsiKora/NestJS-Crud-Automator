import type { IApiAuthorizationRuleContext } from "@interface/class/api/authorization/rule/context.interface";

import { ApiAuthorizationPolicyBase } from "@class/api/authorization/policy/base.class";
import { EAuthorizationEffect } from "@enum/class/authorization/effect.enum";
import { describe, expect, it } from "vitest";

class PolicyEntity {
	public ownerId?: string;
	public owner?: { id?: string };
}

class TestPolicy extends ApiAuthorizationPolicyBase<PolicyEntity> {
	public allowRule() {
		return this.allow();
	}

	public denyRule() {
		return this.deny();
	}

	public allowForRolesRule(roles: Array<string>) {
		return this.allowForRoles(roles);
	}

	public scopeRule(field?: keyof PolicyEntity, options?: { isRelation?: boolean }) {
		return this.scopeToOwner(field, {}, options);
	}
}

describe("ApiAuthorizationPolicyBase", () => {
	it("builds allow and deny rules", () => {
		const policy = new TestPolicy();
		const allowRule = policy.allowRule()[0];
		const denyRule = policy.denyRule()[0];

		expect(allowRule?.effect).toBe(EAuthorizationEffect.ALLOW);
		expect(denyRule?.effect).toBe(EAuthorizationEffect.DENY);
	});

	it("creates allow rules for matching roles", () => {
		const policy = new TestPolicy();
		const rule = policy.allowForRolesRule(["admin"])[0];
		const context = { subject: { roles: ["admin"] } } as IApiAuthorizationRuleContext<PolicyEntity>;

		expect(rule?.effect).toBe(EAuthorizationEffect.ALLOW);
		expect(rule?.condition?.(context)).toBe(true);
	});

	it("scopes to owner based on relation or scalar fields", () => {
		const policy = new TestPolicy();
		const relationRule = policy.scopeRule("owner")[0];
		const scalarRule = policy.scopeRule("ownerId")[0];

		const context = { subject: { id: "user-1" } } as IApiAuthorizationRuleContext<PolicyEntity>;

		expect(relationRule?.scope?.(context)).toEqual({ where: { owner: { id: "user-1" } } });
		expect(scalarRule?.scope?.(context)).toEqual({ where: { ownerId: "user-1" } });
	});
});
