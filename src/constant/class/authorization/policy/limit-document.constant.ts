// The longest document, as JSON text in UTF-16 code units: about ten times the largest document in real use.
const MAX_DOCUMENT_LENGTH: number = 131_072;

// The most statements one document holds: the largest document in real use has about 30.
const MAX_STATEMENTS: number = 256;

/**
 * Limits a policy document is held to, at save and at load. A document over a limit fails with
 * `iamPolicyDocumentInvalid`, so a stored document cannot make every request of its principals slow.
 */
export const AUTHORIZATION_POLICY_DOCUMENT_LIMIT_CONSTANT: {
	readonly MAX_DOCUMENT_LENGTH: number;
	readonly MAX_STATEMENTS: number;
} = {
	MAX_DOCUMENT_LENGTH,
	MAX_STATEMENTS,
} as const;
