import type { IApiAuthorizationDecision } from "@interface/class/api/authorization/decision.interface";
import type { IApiAuthorizationRuleContext } from "@interface/class/api/authorization/rule";
import type { IApiAuthorizationSubject } from "@interface/class/api/authorization/subject.interface";

import { EAuthorizationEffect } from "@enum/class/authorization/effect.enum";
import { AuthorizationDecisionApplyResult } from "@utility/authorization/decision/apply-result.utility";
import { describe, expect, it, vi } from "vitest";

class DecisionEntity {
	public id?: string;
}

const subject: IApiAuthorizationSubject = {
	id: "subject-1",
	permissions: [],
	roles: [],
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
			effect: EAuthorizationEffect.ALLOW,
			policyId: "policy-1",
			policyIds: ["policy-1"],
			resource: { id: "resource-1" },
			resourceType: "DecisionEntity",
			scope: undefined,
			subject,
			transforms: [transformOne, transformTwo],
		};

		const result = await AuthorizationDecisionApplyResult(decision, { count: 1 });

		expect(result).toEqual({ count: 4 });
		expect(transformOne).toHaveBeenCalledTimes(1);
		expect(transformTwo).toHaveBeenCalledTimes(1);
		expect(transformOne.mock.calls[0]?.[1]?.resource).toMatchObject({ id: "resource-1" });
		expect(transformOne.mock.calls[0]?.[1]?.subject).toMatchObject(subject);
	});

	it("returns original result when no transforms exist", async () => {
		const decision: IApiAuthorizationDecision<DecisionEntity, { count: number }> = {
			action: "get",
			appliedRules: [],
			effect: EAuthorizationEffect.ALLOW,
			policyId: "policy-2",
			policyIds: ["policy-2"],
			resourceType: "DecisionEntity",
			subject,
			transforms: [],
		};

		const payload = { count: 10 };
		const result = await AuthorizationDecisionApplyResult(decision, payload);

		expect(result).toBe(payload);
	});
});
