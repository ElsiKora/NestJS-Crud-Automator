import type { EApiAuthorizationDecisionType, EApiAuthorizationMode } from "@enum/class/authorization";

import type { IApiPolicyAttachment } from "../policy/attachment/interface";
import type { IApiPolicyDocumentRecord } from "../policy/document/record.interface";

import type { IApiAuthorizationDecisionRuleTrace } from "./rule-trace.interface";
import type { IApiAuthorizationDecisionStatementTrace } from "./statement-trace.interface";

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
