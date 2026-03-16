import type { IApiAuthorizationDecision } from "@interface/class/api/authorization/decision";
import type { IApiAuthorizationRuleContext } from "@interface/class/api/authorization/rule";
import type { IApiAuthorizationPrincipal } from "@interface/class/api/authorization/principal";

import { EApiAuthorizationDecisionType, EApiAuthorizationMode, EApiAuthorizationPrincipalType, EApiPolicyEffect } from "@enum/class/authorization";
import { AuthorizationDecisionApplyResult } from "@utility/authorization/decision/apply-result.utility";
import { describe, expect, it, vi } from "vitest";

class DecisionEntity {
	public id?: string;
}

const principal: IApiAuthorizationPrincipal = {
	attributes: {},
	id: "subject-1",
	roles: [],
	type: EApiAuthorizationPrincipalType.USER,
};

describe("AuthorizationDecisionApplyResult", () => {
	it("applies transforms in order with context", async () => {
		const transformOne = vi.fn(async (result: { count: number }, _context: IApiAuthorizationRuleContext<DecisionEntity>) => {
			void _context;
			return {
				...result,
				count: result.count + 1,
			};
		});
		const transformTwo = vi.fn(async (result: { count: number }, _context: IApiAuthorizationRuleContext<DecisionEntity>) => {
			void _context;
			return {
				...result,
				count: result.count * 2,
			};
		});

		const decision: IApiAuthorizationDecision<DecisionEntity, { count: number }> = {
			action: "get",
			appliedRules: [],
			effect: EApiPolicyEffect.ALLOW,
			mode: EApiAuthorizationMode.HOOKS,
			permissions: ["admin.item.read"],
			policyId: "policy-1",
			policyIds: ["policy-1"],
			principal,
			resource: { id: "resource-1" },
			resourceType: "DecisionEntity",
			scope: undefined,
			trace: {
				decisionType: EApiAuthorizationDecisionType.EXPLICIT_ALLOW,
				mode: EApiAuthorizationMode.HOOKS,
				permissions: ["admin.item.read"],
			},
			transforms: [transformOne, transformTwo],
		};

		const result = await AuthorizationDecisionApplyResult(decision, { count: 1 });

		expect(result).toEqual({ count: 4 });
		expect(transformOne).toHaveBeenCalledTimes(1);
		expect(transformTwo).toHaveBeenCalledTimes(1);
		expect(transformOne.mock.calls[0]?.[1]?.resource).toMatchObject({ id: "resource-1" });
		expect(transformOne.mock.calls[0]?.[1]?.principal).toMatchObject(principal);
	});

	it("returns original result when no transforms exist", async () => {
		const decision: IApiAuthorizationDecision<DecisionEntity, { count: number }> = {
			action: "get",
			appliedRules: [],
			effect: EApiPolicyEffect.ALLOW,
			mode: EApiAuthorizationMode.HOOKS,
			permissions: [],
			policyId: "policy-2",
			policyIds: ["policy-2"],
			principal,
			resourceType: "DecisionEntity",
			trace: {
				decisionType: EApiAuthorizationDecisionType.EXPLICIT_ALLOW,
				mode: EApiAuthorizationMode.HOOKS,
				permissions: [],
			},
			transforms: [],
		};

		const payload = { count: 10 };
		const result = await AuthorizationDecisionApplyResult(decision, payload);

		expect(result).toBe(payload);
	});
});
