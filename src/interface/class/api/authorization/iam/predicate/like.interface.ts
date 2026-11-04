import type { EApiAuthorizationIamPredicateKind } from "@enum/class/authorization";
import type { IApiAuthorizationIamPredicateColumn } from "@interface/class/api/authorization/iam/predicate/column.interface";
import type { IApiAuthorizationIamToken } from "@interface/class/api/authorization/iam/token.interface";

/**
 * An IAM predicate atom: the column's text matches a glob, or, negated, does not. A NULL column matches neither.
 */
export interface IApiAuthorizationIamPredicateLike {
	// Column the atom reads.
	column: IApiAuthorizationIamPredicateColumn;
	// Whether a condition key wrote the glob, and not a resource pattern. A resource pattern lowers only where a coarser `LIKE` can hide a row; a key's glob must be exact on both sides.
	isConditionKey?: boolean;
	// Whether the column must not match the glob.
	isNegated: boolean;
	kind: EApiAuthorizationIamPredicateKind.LIKE;
	// Literal, `*` and `?` tokens of the glob; a literal `*` or `?` is a literal token.
	pattern: ReadonlyArray<IApiAuthorizationIamToken>;
}
