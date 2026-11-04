import type { EApiPolicyConditionOperator, EApiPolicyConditionOperatorFamily, EApiPolicyConditionQualifier } from "@enum/class/authorization";
import type { IApiAuthorizationIamConditionValue } from "@interface/class/api/authorization/iam/statement/value.interface";

/**
 * One condition key of a statement read by the IAM grammar: `"<Qualifier:>?<Operator><IfExists>?": { "<key>": value }`.
 */
export interface IApiAuthorizationIamCondition {
	// Value family of the operator.
	family: EApiPolicyConditionOperatorFamily;
	// Whether the operator has the `IfExists` suffix, so the key holds when its value is missing.
	isIfExists: boolean;
	// Whether the operator negates its family's positive comparison.
	isNegated: boolean;
	// Context key, such as `resource.status` or `principal.attributes.tenantId`.
	key: string;
	// Base operator, without the qualifier and the `IfExists` suffix.
	operator: EApiPolicyConditionOperator;
	// Set qualifier, when the operator has one.
	qualifier?: EApiPolicyConditionQualifier;
	// The operator as the document writes it, such as `ForAnyValue:StringEqualsIfExists`.
	source: string;
	// Values of the key; several values mean OR.
	values: ReadonlyArray<IApiAuthorizationIamConditionValue>;
}
