import type { IApiAuthorizationIamToken } from "@interface/class/api/authorization/iam/token.interface";

/**
 * One condition value read by the IAM grammar.
 */
export interface IApiAuthorizationIamConditionValue {
	// Literal and variable tokens of a string value, escapes already read; empty for a number or a boolean.
	parts: ReadonlyArray<IApiAuthorizationIamToken>;
	// The value as the document writes it.
	source: boolean | number | string;
}
