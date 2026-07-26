import type { EApiAuthorizationDecisionType, EApiAuthorizationMode } from "@enum/class/authorization";
import type { IApiAuthorizationDecisionRuleTrace } from "@interface/class/api/authorization/decision/rule-trace.interface";
import type { IApiAuthorizationDecisionStatementTrace } from "@interface/class/api/authorization/decision/statement-trace.interface";
import type { IApiPolicyAttachment } from "@interface/class/api/authorization/policy/attachment/interface";
import type { IApiPolicyDocumentRecord } from "@interface/class/api/authorization/policy/document/record.interface";

export interface IApiAuthorizationDecisionTrace {
	attachments?: ReadonlyArray<IApiPolicyAttachment>;
	boundaries?: ReadonlyArray<IApiPolicyAttachment>;
	decisionType: EApiAuthorizationDecisionType;
	documents?: ReadonlyArray<IApiPolicyDocumentRecord>;
	mode: EApiAuthorizationMode;
	permissions?: ReadonlyArray<string>;
	rules?: ReadonlyArray<IApiAuthorizationDecisionRuleTrace>;
	statements?: ReadonlyArray<IApiAuthorizationDecisionStatementTrace>;
}
