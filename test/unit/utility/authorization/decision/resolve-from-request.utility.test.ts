import type { IApiAuthenticationRequest } from "@interface/api";
import type { IApiAuthorizationDecision } from "@interface/class/api/authorization/decision.interface";
import type { IApiAuthorizationSubject } from "@interface/class/api/authorization/subject.interface";

import { AUTHORIZATION_DECISION_METADATA_CONSTANT } from "@constant/class/authorization";
import { EAuthorizationEffect } from "@enum/class/authorization/effect.enum";
import { AuthorizationDecisionResolveFromRequest } from "@utility/authorization/decision/resolve-from-request.utility";
import { describe, expect, it } from "vitest";

class RequestEntity {
	public id?: string;
}

const subject: IApiAuthorizationSubject = {
	id: "subject-request",
	permissions: [],
	roles: [],
};

const decision: IApiAuthorizationDecision<RequestEntity, RequestEntity> = {
	action: "get",
	appliedRules: [],
	effect: EAuthorizationEffect.ALLOW,
	policyId: "policy-request",
	policyIds: ["policy-request"],
	resourceType: "RequestEntity",
	subject,
	transforms: [],
};

describe("AuthorizationDecisionResolveFromRequest", () => {
	it("resolves decision from metadata key", () => {
		const authenticationRequest = {
			[AUTHORIZATION_DECISION_METADATA_CONSTANT.REQUEST_KEY]: decision,
			user: subject,
		} as unknown as IApiAuthenticationRequest;

		const resolved = AuthorizationDecisionResolveFromRequest<RequestEntity, RequestEntity>(authenticationRequest);

		expect(resolved).toBe(decision);
	});

	it("resolves decision from fallback property", () => {
		const authenticationRequest = {
			authorizationDecision: decision,
			user: subject,
		} as unknown as IApiAuthenticationRequest;

		const resolved = AuthorizationDecisionResolveFromRequest<RequestEntity, RequestEntity>(authenticationRequest);

		expect(resolved).toBe(decision);
	});

	it("returns undefined when request is missing", () => {
		const resolved = AuthorizationDecisionResolveFromRequest<RequestEntity, RequestEntity>(undefined);

		expect(resolved).toBeUndefined();
	});
});
