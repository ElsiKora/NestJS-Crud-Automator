import type { IApiAuthorizationIamToken } from "@interface/class/api/authorization/iam/token.interface";

/**
 * One `Action` or `Resource` pattern read by the IAM grammar.
 */
export interface IApiAuthorizationIamPattern {
	// The pattern as the document writes it.
	source: string;
	// Literal, `*`, `?` and variable tokens of the pattern.
	tokens: ReadonlyArray<IApiAuthorizationIamToken>;
}
