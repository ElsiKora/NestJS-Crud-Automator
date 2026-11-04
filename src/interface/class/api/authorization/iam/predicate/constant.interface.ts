import type { EApiAuthorizationIamPredicateKind } from "@enum/class/authorization";

/**
 * An IAM predicate node that holds for every row, or for none.
 */
export interface IApiAuthorizationIamPredicateConstant {
	kind: EApiAuthorizationIamPredicateKind.FALSE | EApiAuthorizationIamPredicateKind.TRUE;
}
