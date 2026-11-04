/**
 * How an IAM `COMPARE` atom orders its column against its value. Each operator's complement over non-NULL values is also
 * an operator, so a negation is never a `NOT` a NULL could turn `UNKNOWN`.
 */
export enum EApiAuthorizationIamPredicateOperator {
	EQUAL = "equal",
	GREATER_THAN = "greater-than",
	GREATER_THAN_EQUAL = "greater-than-equal",
	LESS_THAN = "less-than",
	LESS_THAN_EQUAL = "less-than-equal",
	NOT_EQUAL = "not-equal",
}
