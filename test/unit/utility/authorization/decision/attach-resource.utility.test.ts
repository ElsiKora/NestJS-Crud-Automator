import type { IApiAuthorizationDecision } from "@interface/class/api/authorization/decision.interface";
import type { IApiAuthorizationSubject } from "@interface/class/api/authorization/subject.interface";

import { EAuthorizationEffect } from "@enum/class/authorization/effect.enum";
import { AuthorizationDecisionAttachResource } from "@utility/authorization/decision/attach-resource.utility";
import { describe, expect, it } from "vitest";

class DecisionResourceEntity {
	public id?: string;
}

const subject: IApiAuthorizationSubject = {
	id: "subject-attach",
	permissions: [],
	roles: [],
};

describe("AuthorizationDecisionAttachResource", () => {
	it("attaches resource when decision exists", () => {
		const decision: IApiAuthorizationDecision<DecisionResourceEntity, DecisionResourceEntity> = {
			action: "get",
			appliedRules: [],
			effect: EAuthorizationEffect.ALLOW,
			policyId: "policy-attach",
			policyIds: ["policy-attach"],
			resourceType: "DecisionResourceEntity",
			subject,
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
			effect: EAuthorizationEffect.ALLOW,
			policyId: "policy-attach",
			policyIds: ["policy-attach"],
			resourceType: "DecisionResourceEntity",
			subject,
			transforms: [],
		};

		const result = AuthorizationDecisionAttachResource(decision, undefined);

		expect(result).toBe(decision);
	});
});
