import type { EApiAuthorizationIamPredicateKind } from "@enum/class/authorization";
import type { IApiAuthorizationIamPredicateColumn } from "@interface/class/api/authorization/iam/predicate/column.interface";

/**
 * An IAM predicate atom: the column is NULL, or is not.
 */
export interface IApiAuthorizationIamPredicateNull {
	// Column the atom reads.
	column: IApiAuthorizationIamPredicateColumn;
	kind: EApiAuthorizationIamPredicateKind.IS_NULL | EApiAuthorizationIamPredicateKind.NOT_NULL;
}
