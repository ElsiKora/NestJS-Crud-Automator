import type { IApiAuthorizationIamPredicateArn } from "@interface/class/api/authorization/iam/predicate/arn.interface";
import type { IApiAuthorizationIamPredicateCompare } from "@interface/class/api/authorization/iam/predicate/compare.interface";
import type { IApiAuthorizationIamPredicateExists } from "@interface/class/api/authorization/iam/predicate/exists.interface";
import type { IApiAuthorizationIamPredicateIn } from "@interface/class/api/authorization/iam/predicate/in.interface";
import type { IApiAuthorizationIamPredicateIpContained } from "@interface/class/api/authorization/iam/predicate/ip-contained.interface";
import type { IApiAuthorizationIamPredicateLike } from "@interface/class/api/authorization/iam/predicate/like.interface";
import type { IApiAuthorizationIamPredicateNull } from "@interface/class/api/authorization/iam/predicate/null.interface";

/**
 * An IAM predicate atom: a condition on one column, which a dialect lowerer turns into one TypeORM condition.
 */
export type TApiAuthorizationIamPredicateAtom = IApiAuthorizationIamPredicateArn | IApiAuthorizationIamPredicateCompare | IApiAuthorizationIamPredicateExists | IApiAuthorizationIamPredicateIn | IApiAuthorizationIamPredicateIpContained | IApiAuthorizationIamPredicateLike | IApiAuthorizationIamPredicateNull;
