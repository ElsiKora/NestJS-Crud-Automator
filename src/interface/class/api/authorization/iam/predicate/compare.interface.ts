import type { EApiAuthorizationIamPredicateComparison, EApiAuthorizationIamPredicateKind, EApiAuthorizationIamPredicateOperator } from "@enum/class/authorization";
import type { IApiAuthorizationIamPredicateColumn } from "@interface/class/api/authorization/iam/predicate/column.interface";

/**
 * An IAM predicate atom: the column compares with one value by the column's order. A NULL column holds in no comparison.
 */
export interface IApiAuthorizationIamPredicateCompare {
	// Column the atom reads.
	column: IApiAuthorizationIamPredicateColumn;
	// What the column and the value hold: `NUMERIC` or `DATE`.
	comparison: EApiAuthorizationIamPredicateComparison;
	kind: EApiAuthorizationIamPredicateKind.COMPARE;
	// How the column must compare with the value.
	operator: EApiAuthorizationIamPredicateOperator;
	// Canonical text of the value: a decimal, ISO 8601 UTC with milliseconds, or `YYYY-MM-DD`.
	value: string;
}
