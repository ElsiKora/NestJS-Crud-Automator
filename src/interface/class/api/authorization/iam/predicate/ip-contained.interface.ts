import type { EApiAuthorizationIamPredicateKind } from "@enum/class/authorization";
import type { IApiAuthorizationIamPredicateColumn } from "@interface/class/api/authorization/iam/predicate/column.interface";

/**
 * An IAM predicate atom: the column's network lies within a range, or, negated, does not. A NULL column does neither.
 */
export interface IApiAuthorizationIamPredicateIpContained {
	// Column the atom reads.
	column: IApiAuthorizationIamPredicateColumn;
	// Whether the column must not lie within the range.
	isNegated: boolean;
	kind: EApiAuthorizationIamPredicateKind.IP_CONTAINED;
	// The range as text PostgreSQL `inet` reads.
	range: string;
}
