import type { EApiPolicyEffect, EApiPolicySourceType } from "@enum/class/authorization";

export interface IApiAuthorizationDecisionStatementTrace {
	effect: EApiPolicyEffect;
	isMatched: boolean;
	policyId: string;
	sid?: string;
	sourceType: EApiPolicySourceType;
}
