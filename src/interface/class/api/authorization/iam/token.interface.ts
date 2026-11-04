import type { EApiAuthorizationIamTokenType } from "@enum/class/authorization";
import type { IApiAuthorizationIamVariable } from "@interface/class/api/authorization/iam/variable.interface";

/**
 * One token of an IAM pattern or condition value, as the policy grammar reads it.
 */
export interface IApiAuthorizationIamToken {
	// Kind of the token.
	type: EApiAuthorizationIamTokenType;
	// Literal text of a `LITERAL` token, escapes already read.
	value?: string;
	// Variable of a `VARIABLE` token.
	variable?: IApiAuthorizationIamVariable;
}
