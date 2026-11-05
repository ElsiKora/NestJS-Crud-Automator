import type { EApiAuthorizationIamPredicateKind } from "@enum/class/authorization";
import type { IApiAuthorizationIamCollection } from "@interface/class/api/authorization/iam/collection.interface";
import type { IApiAuthorizationIamPredicateColumn } from "@interface/class/api/authorization/iam/predicate/column.interface";
import type { TApiAuthorizationIamPredicate } from "@type/class/api/authorization/iam/predicate.type";

/**
 * An IAM predicate atom: some row of a to-many relation of the row satisfies a predicate on one column of the related
 * row, or, negated, none does. It reads a set, so it is never NULL: a row without related rows satisfies the negated
 * form only.
 */
export interface IApiAuthorizationIamPredicateExists {
	// The subquery over the related rows.
	collection: IApiAuthorizationIamCollection;
	// Resource column the subquery is correlated with.
	column: IApiAuthorizationIamPredicateColumn;
	// Whether no related row may satisfy the predicate.
	isNegated: boolean;
	kind: EApiAuthorizationIamPredicateKind.EXISTS;
	// Predicate on the column of a related row, NULL-complete as every key pair is.
	predicate: TApiAuthorizationIamPredicate;
}
