import type { IApiAuthenticationRequest } from "@interface/api";
import type { IApiAuthorizationDecision } from "@interface/class/api/authorization/decision";
import type { IApiAuthorizationPrincipal } from "@interface/class/api/authorization/principal";

import { AUTHORIZATION_DECISION_METADATA_CONSTANT } from "@constant/class/authorization";
import { EApiAuthorizationDecisionType, EApiAuthorizationMode, EApiAuthorizationPrincipalType, EApiPolicyEffect } from "@enum/class/authorization";
import { AuthorizationDecisionResolveFromRequest } from "@utility/authorization/decision/resolve-from-request.utility";
import { describe, expect, it } from "vitest";

class RequestEntity {
	public id?: string;
}

const principal: IApiAuthorizationPrincipal = {
	attributes: {},
	id: "subject-request",
	roles: [],
	type: EApiAuthorizationPrincipalType.USER,
};

const decision: IApiAuthorizationDecision<RequestEntity, RequestEntity> = {
	action: "get",
	appliedRules: [],
	effect: EApiPolicyEffect.ALLOW,
	mode: EApiAuthorizationMode.HOOKS,
	permissions: [],
	policyId: "policy-request",
	policyIds: ["policy-request"],
	principal,
	resourceType: "RequestEntity",
	trace: {
		decisionType: EApiAuthorizationDecisionType.EXPLICIT_ALLOW,
		mode: EApiAuthorizationMode.HOOKS,
		permissions: [],
	},
	transforms: [],
};

describe("AuthorizationDecisionResolveFromRequest", () => {
	it("resolves decision from metadata key", () => {
		const authenticationRequest = {
			[AUTHORIZATION_DECISION_METADATA_CONSTANT.REQUEST_KEY]: decision,
			user: principal,
		} as unknown as IApiAuthenticationRequest;

		const resolved = AuthorizationDecisionResolveFromRequest<RequestEntity, RequestEntity>(authenticationRequest);

		expect(resolved).toBe(decision);
	});

	it("resolves decision from fallback property", () => {
		const authenticationRequest = {
			authorizationDecision: decision,
			user: principal,
		} as unknown as IApiAuthenticationRequest;

		const resolved = AuthorizationDecisionResolveFromRequest<RequestEntity, RequestEntity>(authenticationRequest);

		expect(resolved).toBe(decision);
	});

	it("returns undefined when request is missing", () => {
		const resolved = AuthorizationDecisionResolveFromRequest<RequestEntity, RequestEntity>(undefined);

		expect(resolved).toBeUndefined();
	});
});
