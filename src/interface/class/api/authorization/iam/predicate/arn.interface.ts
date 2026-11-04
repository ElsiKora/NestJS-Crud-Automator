import type { EApiAuthorizationIamPredicateKind } from "@enum/class/authorization";
import type { IApiAuthorizationIamPredicateColumn } from "@interface/class/api/authorization/iam/predicate/column.interface";
import type { IApiAuthorizationIamToken } from "@interface/class/api/authorization/iam/token.interface";

/**
 * An IAM predicate atom: the column's text matches an Arn pattern segment by segment, or, negated, does not. Segments
 * split on `:`, their counts must be equal, and `*` and `?` stay within one. A NULL column matches neither.
 */
export interface IApiAuthorizationIamPredicateArn {
	// Column the atom reads.
	column: IApiAuthorizationIamPredicateColumn;
	// Whether the column must not match the pattern.
	isNegated: boolean;
	kind: EApiAuthorizationIamPredicateKind.ARN;
	// Literal, `*` and `?` tokens of the pattern.
	pattern: ReadonlyArray<IApiAuthorizationIamToken>;
}
