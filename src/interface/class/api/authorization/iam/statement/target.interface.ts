import type { IApiAuthorizationIamPattern } from "@interface/class/api/authorization/iam/statement/pattern.interface";

/**
 * The `Action`/`NotAction` or `Resource`/`NotResource` part of a statement read by the IAM grammar.
 */
export interface IApiAuthorizationIamStatementTarget {
	// Whether the statement writes the `Not` form, which applies where no pattern matches.
	isNegated: boolean;
	// Patterns, in document order.
	patterns: ReadonlyArray<IApiAuthorizationIamPattern>;
}
