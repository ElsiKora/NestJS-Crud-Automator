import type { IApiAuthorizationIamOperatorDefinition } from "@interface/class/api/authorization/iam/operator-definition.interface";

import { EApiPolicyConditionOperator, EApiPolicyConditionOperatorFamily } from "@enum/class/authorization";

/**
 * Builds the definition of one base operator.
 * @param {EApiPolicyConditionOperatorFamily} family - Value family.
 * @param {boolean} isNegated - Whether the operator negates the family's positive comparison.
 * @param {boolean} isEvaluated - Whether the engine evaluates the operator.
 * @param {boolean} [isIfExistsAllowed] - Whether the operator has an `IfExists` form.
 * @returns {IApiAuthorizationIamOperatorDefinition} Operator definition.
 */
function defineOperator(family: EApiPolicyConditionOperatorFamily, isNegated: boolean, isEvaluated: boolean, isIfExistsAllowed: boolean = true): IApiAuthorizationIamOperatorDefinition {
	return { family, isEvaluated, isIfExistsAllowed, isNegated };
}

// Values one key takes at most.
const MAX_VALUES: number = 64;

// Base operators, written without `IfExists`. `isEvaluated` turns on as each family reaches the engine.
const OPERATORS: ReadonlyMap<string, IApiAuthorizationIamOperatorDefinition> = new Map<string, IApiAuthorizationIamOperatorDefinition>([
	[EApiPolicyConditionOperator.ARN_EQUALS, defineOperator(EApiPolicyConditionOperatorFamily.ARN, false, false)],
	[EApiPolicyConditionOperator.ARN_LIKE, defineOperator(EApiPolicyConditionOperatorFamily.ARN, false, false)],
	[EApiPolicyConditionOperator.ARN_NOT_EQUALS, defineOperator(EApiPolicyConditionOperatorFamily.ARN, true, false)],
	[EApiPolicyConditionOperator.ARN_NOT_LIKE, defineOperator(EApiPolicyConditionOperatorFamily.ARN, true, false)],
	[EApiPolicyConditionOperator.BOOL, defineOperator(EApiPolicyConditionOperatorFamily.BOOL, false, false)],
	[EApiPolicyConditionOperator.DATE_EQUALS, defineOperator(EApiPolicyConditionOperatorFamily.DATE, false, false)],
	[EApiPolicyConditionOperator.DATE_GREATER_THAN, defineOperator(EApiPolicyConditionOperatorFamily.DATE, false, false)],
	[EApiPolicyConditionOperator.DATE_GREATER_THAN_EQUALS, defineOperator(EApiPolicyConditionOperatorFamily.DATE, false, false)],
	[EApiPolicyConditionOperator.DATE_LESS_THAN, defineOperator(EApiPolicyConditionOperatorFamily.DATE, false, false)],
	[EApiPolicyConditionOperator.DATE_LESS_THAN_EQUALS, defineOperator(EApiPolicyConditionOperatorFamily.DATE, false, false)],
	[EApiPolicyConditionOperator.DATE_NOT_EQUALS, defineOperator(EApiPolicyConditionOperatorFamily.DATE, true, false)],
	[EApiPolicyConditionOperator.IP_ADDRESS, defineOperator(EApiPolicyConditionOperatorFamily.IP_ADDRESS, false, false)],
	[EApiPolicyConditionOperator.NOT_IP_ADDRESS, defineOperator(EApiPolicyConditionOperatorFamily.IP_ADDRESS, true, false)],
	[EApiPolicyConditionOperator.NULL, defineOperator(EApiPolicyConditionOperatorFamily.NULL, false, false, false)],
	[EApiPolicyConditionOperator.NUMERIC_EQUALS, defineOperator(EApiPolicyConditionOperatorFamily.NUMERIC, false, false)],
	[EApiPolicyConditionOperator.NUMERIC_GREATER_THAN, defineOperator(EApiPolicyConditionOperatorFamily.NUMERIC, false, false)],
	[EApiPolicyConditionOperator.NUMERIC_GREATER_THAN_EQUALS, defineOperator(EApiPolicyConditionOperatorFamily.NUMERIC, false, false)],
	[EApiPolicyConditionOperator.NUMERIC_LESS_THAN, defineOperator(EApiPolicyConditionOperatorFamily.NUMERIC, false, false)],
	[EApiPolicyConditionOperator.NUMERIC_LESS_THAN_EQUALS, defineOperator(EApiPolicyConditionOperatorFamily.NUMERIC, false, false)],
	[EApiPolicyConditionOperator.NUMERIC_NOT_EQUALS, defineOperator(EApiPolicyConditionOperatorFamily.NUMERIC, true, false)],
	[EApiPolicyConditionOperator.STRING_EQUALS, defineOperator(EApiPolicyConditionOperatorFamily.STRING, false, true)],
	[EApiPolicyConditionOperator.STRING_EQUALS_IGNORE_CASE, defineOperator(EApiPolicyConditionOperatorFamily.STRING_IGNORE_CASE, false, false)],
	[EApiPolicyConditionOperator.STRING_LIKE, defineOperator(EApiPolicyConditionOperatorFamily.STRING_LIKE, false, false)],
	[EApiPolicyConditionOperator.STRING_NOT_EQUALS, defineOperator(EApiPolicyConditionOperatorFamily.STRING, true, true)],
	[EApiPolicyConditionOperator.STRING_NOT_EQUALS_IGNORE_CASE, defineOperator(EApiPolicyConditionOperatorFamily.STRING_IGNORE_CASE, true, false)],
	[EApiPolicyConditionOperator.STRING_NOT_LIKE, defineOperator(EApiPolicyConditionOperatorFamily.STRING_LIKE, true, false)],
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
