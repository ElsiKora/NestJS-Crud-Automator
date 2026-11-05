/**
 * Constraint codes of IAM policy document validation. The codes are the contract a host translates; the messages that
 * come with them are for logs only.
 */
export const AUTHORIZATION_POLICY_DOCUMENT_FAILURE_CONSTANT: {
	readonly ACTION_CONFLICT: string;
	readonly ACTION_MISSING: string;
	readonly CONDITION_INVALID: string;
	readonly CONDITION_KEY_NOT_ALLOWED: string;
	readonly CONDITION_KEY_NOT_FILTERABLE: string;
	readonly CONDITION_KEY_TYPE_MISMATCH: string;
	readonly CONDITION_KEY_UNKNOWN: string;
	readonly CONDITION_OPERATOR_NOT_ALLOWED: string;
	readonly CONDITION_OPERATOR_UNKNOWN: string;
	readonly CONDITION_QUALIFIER_REQUIRED: string;
	readonly CONDITION_QUALIFIER_UNKNOWN: string;
	readonly CONDITION_QUALIFIER_UNSUPPORTED: string;
	readonly CONDITION_VALUE_EMPTY: string;
	readonly CONDITION_VALUE_EPOCH_NOT_ALLOWED: string;
	readonly CONDITION_VALUE_INVALID: string;
	readonly CONDITION_VALUE_NO_TIME_ZONE: string;
	readonly CONDITION_VALUE_TOO_MANY: string;
	readonly CONDITION_VALUE_TOO_PRECISE: string;
	readonly DOCUMENT_INVALID: string;
	readonly EFFECT_INVALID: string;
	readonly FIELD_UNKNOWN: string;
	readonly NOT_SUPPORTED_YET: string;
	readonly PATTERN_INVALID: string;
	readonly PATTERN_OUTSIDE_NAMESPACE: string;
	readonly RESOURCE_CONFLICT: string;
	readonly RESOURCE_MISSING: string;
	readonly SHORTHAND_NOT_ALLOWED: string;
	readonly SID_DUPLICATE: string;
	readonly SID_INVALID: string;
	readonly VARIABLE_NOT_ALLOWED: string;
	readonly VARIABLE_UNKNOWN: string;
	readonly VERSION_INVALID: string;
} = {
	// A statement writes both `Action` and `NotAction`.
	ACTION_CONFLICT: "iamPolicyActionConflict",
	// A statement writes neither `Action` nor `NotAction`, or an empty list.
	ACTION_MISSING: "iamPolicyActionMissing",
	// `Condition`, an operator entry of it, or its key map is not an object, or the key map is empty.
	CONDITION_INVALID: "iamPolicyConditionInvalid",
	// A context key the grammar refuses for good, such as `request.secureTransport`.
	CONDITION_KEY_NOT_ALLOWED: "iamPolicyConditionKeyNotAllowed",
	// A `resource.*` key that no definition of the namespace maps as filterable.
	CONDITION_KEY_NOT_FILTERABLE: "iamPolicyConditionKeyNotFilterable",
	// The operator family does not fit the column a `resource.*` key maps to.
	CONDITION_KEY_TYPE_MISMATCH: "iamPolicyConditionKeyTypeMismatch",
	// A key that is no context key, or a `resource.*` key no definition of the namespace maps.
	CONDITION_KEY_UNKNOWN: "iamPolicyConditionKeyUnknown",
	// An operator the grammar refuses for good: `BinaryEquals` and `StringLikeIgnoreCase`.
	CONDITION_OPERATOR_NOT_ALLOWED: "iamPolicyConditionOperatorNotAllowed",
	// A name that is no condition operator, or `IfExists` on an operator without that form.
	CONDITION_OPERATOR_UNKNOWN: "iamPolicyConditionOperatorUnknown",
	// A `resource.*` key through a to-many relation without `ForAnyValue` or `ForAllValues`: a list of related rows holds no one value.
	CONDITION_QUALIFIER_REQUIRED: "iamPolicyConditionQualifierRequired",
	// A qualifier other than `ForAnyValue` and `ForAllValues`.
	CONDITION_QUALIFIER_UNKNOWN: "iamPolicyConditionQualifierUnknown",
	// A qualifier on a key that holds one value, or on `Null`.
	CONDITION_QUALIFIER_UNSUPPORTED: "iamPolicyConditionQualifierUnsupported",
	// An empty list of values.
	CONDITION_VALUE_EMPTY: "iamPolicyConditionValueEmpty",
	// A date written as epoch seconds; dates are ISO 8601 text.
	CONDITION_VALUE_EPOCH_NOT_ALLOWED: "iamPolicyConditionValueEpochNotAllowed",
	// A value its operator cannot take.
	CONDITION_VALUE_INVALID: "iamPolicyConditionValueInvalid",
	// A date and time without a zone designator.
	CONDITION_VALUE_NO_TIME_ZONE: "iamPolicyConditionValueNoTimeZone",
	// More than 64 values for one key.
	CONDITION_VALUE_TOO_MANY: "iamPolicyConditionValueTooMany",
	// A date and time finer than milliseconds, or a number with more significant digits than the comparison keeps.
	CONDITION_VALUE_TOO_PRECISE: "iamPolicyConditionValueTooPrecise",
	// The document, or one of its statements, is not an object.
	DOCUMENT_INVALID: "iamPolicyDocumentInvalid",
	// `Effect` is neither `Allow` nor `Deny`.
	EFFECT_INVALID: "iamPolicyEffectInvalid",
	// A field the grammar does not know, such as `Principal`.
	FIELD_UNKNOWN: "iamPolicyFieldUnknown",
	// A feature the grammar will take once the engine enforces it.
	NOT_SUPPORTED_YET: "iamPolicyNotSupportedYet",
	// A pattern that is not a non-empty string, or a malformed `${...}`.
	PATTERN_INVALID: "iamPolicyPatternInvalid",
	// An `Action` pattern that matches no action of the document's namespace.
	PATTERN_OUTSIDE_NAMESPACE: "iamPolicyPatternOutsideNamespace",
	// A statement writes both `Resource` and `NotResource`.
	RESOURCE_CONFLICT: "iamPolicyResourceConflict",
	// A statement writes neither `Resource` nor `NotResource`, or an empty list.
	RESOURCE_MISSING: "iamPolicyResourceMissing",
	// A single value where the grammar takes a list: `"Action": "x"` or `"Statement": {...}`.
	SHORTHAND_NOT_ALLOWED: "iamPolicyShorthandNotAllowed",
	// Two statements of one document share a `Sid`.
	SID_DUPLICATE: "iamPolicySidDuplicate",
	// `Sid` is not a non-empty string.
	SID_INVALID: "iamPolicySidInvalid",
	// A variable the grammar refuses where it is written, such as a client-controlled `${request.body.*}` value.
	VARIABLE_NOT_ALLOWED: "iamPolicyVariableNotAllowed",
	// A variable whose path is no context path.
	VARIABLE_UNKNOWN: "iamPolicyVariableUnknown",
	// `Version` is not a non-empty string.
	VERSION_INVALID: "iamPolicyVersionInvalid",
} as const;
