/**
 * How an IAM predicate atom compares a column with its values.
 */
export enum EApiAuthorizationIamPredicateComparison {
	// The column holds a boolean and the values are `true` or `false`.
	BOOLEAN = "boolean",
	// The column's own equality, for a Deny resource-pattern placeholder on a column that holds no text, compared as in 5.1.0. It lowers only negated: a coarser database equality can hide a row there but never show one.
	NATIVE = "native",
	// Code-point equality of text: letter case, accents and trailing spaces count.
	TEXT = "text",
}
