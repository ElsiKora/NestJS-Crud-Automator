import type { TApiAuthorizationIamPredicate } from "@type/class/api/authorization/iam/predicate.type";

/**
 * The two NULL-complete predicates of one condition key or resource-pattern constraint. They are disjoint and together
 * cover every row, NULL columns and missing relations included: an Allow scope uses `holds`, a Deny exclusion keeps
 * the rows of `fails`.
 */
export interface IApiAuthorizationIamPredicatePair {
	// Rows the key fails for.
	fails: TApiAuthorizationIamPredicate;
	// Rows the key holds for.
	holds: TApiAuthorizationIamPredicate;
}
