import type { IApiAuthorizationIamOperatorDefinition } from "@interface/class/api/authorization/iam/operator-definition.interface";

import { EApiAuthorizationIamPredicateOperator, EApiPolicyConditionOperator, EApiPolicyConditionOperatorFamily } from "@enum/class/authorization";

/**
 * Builds the definition of one base operator.
 * @param {EApiPolicyConditionOperatorFamily} family - Value family.
 * @param {boolean} isNegated - Whether the operator negates the family's positive comparison.
 * @param {EApiAuthorizationIamPredicateOperator} [comparison] - How a Numeric or Date operator's positive form orders its value.
 * @param {boolean} [isIfExistsAllowed] - Whether the operator has an `IfExists` form.
 * @returns {IApiAuthorizationIamOperatorDefinition} Operator definition.
 */
function defineOperator(family: EApiPolicyConditionOperatorFamily, isNegated: boolean, comparison?: EApiAuthorizationIamPredicateOperator, isIfExistsAllowed: boolean = true): IApiAuthorizationIamOperatorDefinition {
	return { ...(comparison === undefined ? {} : { comparison }), family, isIfExistsAllowed, isNegated };
}

// Values one key takes at most.
const MAX_VALUES: number = 64;

// Base operators, written without `IfExists`.
const OPERATORS: ReadonlyMap<string, IApiAuthorizationIamOperatorDefinition> = new Map<string, IApiAuthorizationIamOperatorDefinition>([
	[EApiPolicyConditionOperator.ARN_EQUALS, defineOperator(EApiPolicyConditionOperatorFamily.ARN, false)],
	[EApiPolicyConditionOperator.ARN_LIKE, defineOperator(EApiPolicyConditionOperatorFamily.ARN, false)],
	[EApiPolicyConditionOperator.ARN_NOT_EQUALS, defineOperator(EApiPolicyConditionOperatorFamily.ARN, true)],
	[EApiPolicyConditionOperator.ARN_NOT_LIKE, defineOperator(EApiPolicyConditionOperatorFamily.ARN, true)],
	[EApiPolicyConditionOperator.BOOL, defineOperator(EApiPolicyConditionOperatorFamily.BOOL, false)],
	[EApiPolicyConditionOperator.DATE_EQUALS, defineOperator(EApiPolicyConditionOperatorFamily.DATE, false, EApiAuthorizationIamPredicateOperator.EQUAL)],
	[EApiPolicyConditionOperator.DATE_GREATER_THAN, defineOperator(EApiPolicyConditionOperatorFamily.DATE, false, EApiAuthorizationIamPredicateOperator.GREATER_THAN)],
	[EApiPolicyConditionOperator.DATE_GREATER_THAN_EQUALS, defineOperator(EApiPolicyConditionOperatorFamily.DATE, false, EApiAuthorizationIamPredicateOperator.GREATER_THAN_EQUAL)],
	[EApiPolicyConditionOperator.DATE_LESS_THAN, defineOperator(EApiPolicyConditionOperatorFamily.DATE, false, EApiAuthorizationIamPredicateOperator.LESS_THAN)],
	[EApiPolicyConditionOperator.DATE_LESS_THAN_EQUALS, defineOperator(EApiPolicyConditionOperatorFamily.DATE, false, EApiAuthorizationIamPredicateOperator.LESS_THAN_EQUAL)],
	[EApiPolicyConditionOperator.DATE_NOT_EQUALS, defineOperator(EApiPolicyConditionOperatorFamily.DATE, true, EApiAuthorizationIamPredicateOperator.EQUAL)],
	[EApiPolicyConditionOperator.IP_ADDRESS, defineOperator(EApiPolicyConditionOperatorFamily.IP_ADDRESS, false)],
	[EApiPolicyConditionOperator.NOT_IP_ADDRESS, defineOperator(EApiPolicyConditionOperatorFamily.IP_ADDRESS, true)],
	[EApiPolicyConditionOperator.NULL, defineOperator(EApiPolicyConditionOperatorFamily.NULL, false, undefined, false)],
	[EApiPolicyConditionOperator.NUMERIC_EQUALS, defineOperator(EApiPolicyConditionOperatorFamily.NUMERIC, false, EApiAuthorizationIamPredicateOperator.EQUAL)],
	[EApiPolicyConditionOperator.NUMERIC_GREATER_THAN, defineOperator(EApiPolicyConditionOperatorFamily.NUMERIC, false, EApiAuthorizationIamPredicateOperator.GREATER_THAN)],
	[EApiPolicyConditionOperator.NUMERIC_GREATER_THAN_EQUALS, defineOperator(EApiPolicyConditionOperatorFamily.NUMERIC, false, EApiAuthorizationIamPredicateOperator.GREATER_THAN_EQUAL)],
	[EApiPolicyConditionOperator.NUMERIC_LESS_THAN, defineOperator(EApiPolicyConditionOperatorFamily.NUMERIC, false, EApiAuthorizationIamPredicateOperator.LESS_THAN)],
	[EApiPolicyConditionOperator.NUMERIC_LESS_THAN_EQUALS, defineOperator(EApiPolicyConditionOperatorFamily.NUMERIC, false, EApiAuthorizationIamPredicateOperator.LESS_THAN_EQUAL)],
	[EApiPolicyConditionOperator.NUMERIC_NOT_EQUALS, defineOperator(EApiPolicyConditionOperatorFamily.NUMERIC, true, EApiAuthorizationIamPredicateOperator.EQUAL)],
	[EApiPolicyConditionOperator.STRING_EQUALS, defineOperator(EApiPolicyConditionOperatorFamily.STRING, false)],
	[EApiPolicyConditionOperator.STRING_EQUALS_IGNORE_CASE, defineOperator(EApiPolicyConditionOperatorFamily.STRING_IGNORE_CASE, false)],
	[EApiPolicyConditionOperator.STRING_LIKE, defineOperator(EApiPolicyConditionOperatorFamily.STRING_LIKE, false)],
	[EApiPolicyConditionOperator.STRING_NOT_EQUALS, defineOperator(EApiPolicyConditionOperatorFamily.STRING, true)],
	[EApiPolicyConditionOperator.STRING_NOT_EQUALS_IGNORE_CASE, defineOperator(EApiPolicyConditionOperatorFamily.STRING_IGNORE_CASE, true)],
	[EApiPolicyConditionOperator.STRING_NOT_LIKE, defineOperator(EApiPolicyConditionOperatorFamily.STRING_LIKE, true)],
]);

/**
 * What the IAM grammar knows of condition operators.
 */
export const AUTHORIZATION_POLICY_CONDITION_OPERATOR_CONSTANT: {
	readonly IF_EXISTS_SUFFIX: string;
	readonly MAX_VALUES: number;
	readonly OPERATORS: ReadonlyMap<string, IApiAuthorizationIamOperatorDefinition>;
	readonly REFUSED_OPERATORS: ReadonlySet<string>;
} = {
	IF_EXISTS_SUFFIX: "IfExists",
	MAX_VALUES,
	OPERATORS,
	// Base operators refused for good: there are no binary keys, and AWS has no case-insensitive glob.
	REFUSED_OPERATORS: new Set<string>(["BinaryEquals", "StringLikeIgnoreCase"]),
} as const;
