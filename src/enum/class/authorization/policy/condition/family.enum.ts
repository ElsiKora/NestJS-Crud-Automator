/**
 * The value family of an IAM condition operator: it decides which values the operator takes and how it compares them.
 */
export enum EApiPolicyConditionOperatorFamily {
	ARN = "arn",
	BOOL = "bool",
	DATE = "date",
	IP_ADDRESS = "ip-address",
	NULL = "null",
	NUMERIC = "numeric",
	STRING = "string",
	STRING_IGNORE_CASE = "string-ignore-case",
	STRING_LIKE = "string-like",
}
