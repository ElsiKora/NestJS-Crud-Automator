import type { IApiAuthorizationIamPredicateConstant } from "@interface/class/api/authorization/iam/predicate/constant.interface";
import type { IApiAuthorizationIamPredicateGroup } from "@interface/class/api/authorization/iam/predicate/group.interface";
import type { TApiAuthorizationIamPredicateAtom } from "@type/class/api/authorization/iam/atom.type";

/**
 * One node of the IAM predicate IR: an atom, a constant, or an AND or OR of nodes. A later operator family adds an
 * atom kind and its lowerings; the normal form and the WHERE building stay as they are.
 */
export type TApiAuthorizationIamPredicate = IApiAuthorizationIamPredicateConstant | IApiAuthorizationIamPredicateGroup | TApiAuthorizationIamPredicateAtom;
