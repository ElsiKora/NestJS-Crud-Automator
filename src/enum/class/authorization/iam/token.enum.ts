/**
 * The kind of one token of an IAM pattern or condition value, as the policy grammar reads it.
 */
export enum EApiAuthorizationIamTokenType {
	// Literal characters; an escape such as `${*}` reads as its literal character.
	LITERAL = "literal",
	// `?` in a pattern: exactly one character.
	QUESTION_MARK = "question-mark",
	// `*` in a pattern: any sequence of characters, the empty one included.
	STAR = "star",
	// `${root.path}` or `${root.path, 'default'}`.
	VARIABLE = "variable",
}
