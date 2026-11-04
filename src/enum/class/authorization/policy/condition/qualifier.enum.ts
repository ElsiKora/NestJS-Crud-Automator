/**
 * The set qualifier written in front of an IAM condition operator, as in `ForAnyValue:StringEquals`.
 */
export enum EApiPolicyConditionQualifier {
	FOR_ALL_VALUES = "ForAllValues",
	FOR_ANY_VALUE = "ForAnyValue",
}
