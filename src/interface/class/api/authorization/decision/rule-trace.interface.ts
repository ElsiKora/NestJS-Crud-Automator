import type { EApiPolicyEffect } from "@enum/class/authorization";

export interface IApiAuthorizationDecisionRuleTrace {
	description?: string;
	effect: EApiPolicyEffect;
	isMatched: boolean;
	policyId: string;
	priority: number;
}
