import type { EApiAuthorizationIamPredicateOperator, EApiPolicyConditionOperatorFamily } from "@enum/class/authorization";

/**
 * What the IAM grammar knows of one base condition operator, written without `IfExists`.
 */
export interface IApiAuthorizationIamOperatorDefinition {
	// How a Numeric or Date operator's positive form orders the value it reads against the operator's value.
	comparison?: EApiAuthorizationIamPredicateOperator;
	// Value family of the operator.
	family: EApiPolicyConditionOperatorFamily;
	// Whether the operator has an `IfExists` form.
	isIfExistsAllowed: boolean;
	// Whether the operator negates its family's positive comparison, as `StringNotEquals` does.
	isNegated: boolean;
}
