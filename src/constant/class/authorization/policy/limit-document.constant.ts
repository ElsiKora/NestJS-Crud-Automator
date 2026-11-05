// The longest document, as JSON text in UTF-16 code units: about ten times the largest document in real use.
const MAX_DOCUMENT_LENGTH: number = 131_072;

// The longest condition value, in UTF-16 code units: a value in real use is a name or an id of under 100.
const MAX_CONDITION_VALUE_LENGTH: number = 2048;

// The longest Action, NotAction, Resource or NotResource pattern, in UTF-16 code units: one in real use is under 200.
const MAX_PATTERN_LENGTH: number = 2048;

// The most statements one document holds: the largest document in real use has about 30.
const MAX_STATEMENTS: number = 256;

/**
 * Limits a policy document is held to, at save and at load, so a stored document cannot make every request of its
 * principals slow or fail. A document over its length or statement limit fails with `iamPolicyDocumentInvalid`, a longer
 * pattern with `iamPolicyPatternInvalid` and a longer condition value with `iamPolicyConditionValueInvalid`.
 */
export const AUTHORIZATION_POLICY_DOCUMENT_LIMIT_CONSTANT: {
	readonly MAX_CONDITION_VALUE_LENGTH: number;
	readonly MAX_DOCUMENT_LENGTH: number;
	readonly MAX_PATTERN_LENGTH: number;
	readonly MAX_STATEMENTS: number;
} = {
	MAX_CONDITION_VALUE_LENGTH,
	MAX_DOCUMENT_LENGTH,
	MAX_PATTERN_LENGTH,
	MAX_STATEMENTS,
} as const;
