import type { EApiAuthorizationIamPredicateComparison, EApiAuthorizationIamPredicateKind } from "@enum/class/authorization";
import type { IApiAuthorizationIamPredicateColumn } from "@interface/class/api/authorization/iam/predicate/column.interface";
import type { TApiAuthorizationIamPredicateValue } from "@type/class/api/authorization/iam/value.type";

/**
 * An IAM predicate atom: the column equals one of the values, or, negated, none of them. A NULL column is in neither
 * set, so a negated atom always meets an explicit `IS_NULL` branch where NULL rows must be kept.
 */
export interface IApiAuthorizationIamPredicateIn {
	// Column the atom reads.
	column: IApiAuthorizationIamPredicateColumn;
	// How the column is compared with the values.
	comparison: EApiAuthorizationIamPredicateComparison;
	// Whether the column must equal none of the values.
	isNegated: boolean;
	kind: EApiAuthorizationIamPredicateKind.IN;
	// Values: canonical text for a `TEXT` or `NATIVE` comparison, booleans for a `BOOLEAN` one; never empty.
	values: ReadonlyArray<TApiAuthorizationIamPredicateValue>;
}
