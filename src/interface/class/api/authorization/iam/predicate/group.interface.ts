import type { EApiAuthorizationIamPredicateKind } from "@enum/class/authorization";
import type { TApiAuthorizationIamPredicate } from "@type/class/api/authorization/iam/predicate.type";

/**
 * An IAM predicate node that ANDs or ORs its children.
 */
export interface IApiAuthorizationIamPredicateGroup {
	// Child nodes, in order; the order fixes the order of the WHERE branches.
	children: ReadonlyArray<TApiAuthorizationIamPredicate>;
	kind: EApiAuthorizationIamPredicateKind.AND | EApiAuthorizationIamPredicateKind.OR;
}
