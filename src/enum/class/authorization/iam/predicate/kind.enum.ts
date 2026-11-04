/**
 * The kind of one node of the IAM predicate IR. A negation is never a node of its own: every atom carries its own
 * polarity, and each condition key compiles into a NULL-complete `holds` and `fails` pair, so SQL `UNKNOWN` cannot turn
 * a negated comparison into a leak.
 */
export enum EApiAuthorizationIamPredicateKind {
	// Every child holds.
	AND = "and",
	// No row.
	FALSE = "false",
	// The column equals one of the values, or, negated, none of them; a NULL column is in neither set.
	IN = "in",
	// The column is NULL.
	IS_NULL = "is-null",
	// The column matches a glob of literals, `*` and `?`, or, negated, does not; a NULL column matches neither.
	LIKE = "like",
	// The column is not NULL.
	NOT_NULL = "not-null",
	// Some child holds.
	OR = "or",
	// Every row.
	TRUE = "true",
}
