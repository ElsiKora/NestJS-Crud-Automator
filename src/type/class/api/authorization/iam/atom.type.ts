import type { IApiAuthorizationIamPredicateIn } from "@interface/class/api/authorization/iam/predicate/in.interface";
import type { IApiAuthorizationIamPredicateLike } from "@interface/class/api/authorization/iam/predicate/like.interface";
import type { IApiAuthorizationIamPredicateNull } from "@interface/class/api/authorization/iam/predicate/null.interface";

/**
 * An IAM predicate atom: a condition on one column, which a dialect lowerer turns into one TypeORM condition.
 */
export type TApiAuthorizationIamPredicateAtom = IApiAuthorizationIamPredicateIn | IApiAuthorizationIamPredicateLike | IApiAuthorizationIamPredicateNull;
