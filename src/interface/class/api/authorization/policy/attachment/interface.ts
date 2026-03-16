import type { EApiAuthorizationPrincipalType } from "@enum/class/authorization";

export interface IApiPolicyAttachment {
	metadata?: Record<string, unknown>;
	policyId: string;
	principalId: string;
	principalType: EApiAuthorizationPrincipalType;
}
