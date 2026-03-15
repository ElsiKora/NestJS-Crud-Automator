import type { IApiAuthorizationDecision } from "@interface/class/api/authorization/decision";
import type { IApiAuthorizationPrincipal } from "@interface/class/api/authorization/principal";

import { EApiAuthorizationDecisionType, EApiAuthorizationMode, EApiAuthorizationPrincipalType, EApiPolicyEffect } from "@enum/class/authorization";
import { AuthorizationDecisionAttachResource } from "@utility/authorization/decision/attach-resource.utility";
import { describe, expect, it } from "vitest";

class DecisionResourceEntity {
	public id?: string;
}

const principal: IApiAuthorizationPrincipal = {
	attributes: {},
	id: "subject-attach",
	roles: [],
	type: EApiAuthorizationPrincipalType.USER,
};

describe("AuthorizationDecisionAttachResource", () => {
	it("attaches resource when decision exists", () => {
		const decision: IApiAuthorizationDecision<DecisionResourceEntity, DecisionResourceEntity> = {
			action: "get",
			appliedRules: [],
			effect: EApiPolicyEffect.ALLOW,
			mode: EApiAuthorizationMode.HOOKS,
			permissions: [],
			policyId: "policy-attach",
			policyIds: ["policy-attach"],
			principal,
			resourceType: "DecisionResourceEntity",
			trace: {
				decisionType: EApiAuthorizationDecisionType.EXPLICIT_ALLOW,
				mode: EApiAuthorizationMode.HOOKS,
				permissions: [],
			},
			transforms: [],
		};
		const resource = { id: "resource-1" };

		const result = AuthorizationDecisionAttachResource(decision, resource);

		expect(result?.resource).toEqual(resource);
	});

	it("returns decision unchanged when resource is undefined", () => {
		const decision: IApiAuthorizationDecision<DecisionResourceEntity, DecisionResourceEntity> = {
			action: "get",
			appliedRules: [],
			effect: EApiPolicyEffect.ALLOW,
			mode: EApiAuthorizationMode.HOOKS,
			permissions: [],
			policyId: "policy-attach",
			policyIds: ["policy-attach"],
			principal,
			resourceType: "DecisionResourceEntity",
			trace: {
				decisionType: EApiAuthorizationDecisionType.EXPLICIT_ALLOW,
				mode: EApiAuthorizationMode.HOOKS,
				permissions: [],
			},
			transforms: [],
		};

		const result = AuthorizationDecisionAttachResource(decision, undefined);

		expect(result).toBe(decision);
	});
});
