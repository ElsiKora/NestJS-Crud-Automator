import type { EApiPolicyConditionOperatorFamily } from "@enum/class/authorization";

/**
 * What the IAM grammar knows of one base condition operator, written without `IfExists`.
 */
export interface IApiAuthorizationIamOperatorDefinition {
	// Value family of the operator.
	family: EApiPolicyConditionOperatorFamily;
	// Whether the engine evaluates the operator; an operator it does not evaluate yet fails document validation.
	isEvaluated: boolean;
	// Whether the operator has an `IfExists` form.
	isIfExistsAllowed: boolean;
	// Whether the operator negates its family's positive comparison, as `StringNotEquals` does.
	isNegated: boolean;
}
