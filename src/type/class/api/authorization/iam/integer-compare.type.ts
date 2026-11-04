import type { EApiAuthorizationIamPredicateOperator } from "@enum/class/authorization/iam/predicate/operator.enum";

/**
 * What a comparison of an integer column lowers to once its literal is rewritten: every row that is not NULL, no row,
 * or one comparison with an integer.
 */
export type TApiAuthorizationIamIntegerCompare = "all" | "none" | { operator: EApiAuthorizationIamPredicateOperator; value: bigint };
