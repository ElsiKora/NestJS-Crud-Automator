/**
 * How an IAM predicate atom compares a column with its values.
 */
export enum EApiAuthorizationIamPredicateComparison {
	// The column holds a boolean and the values are `true` or `false`.
	BOOLEAN = "boolean",
	// The column holds an instant or a calendar date and the value is one too.
	DATE = "date",
	// The column's own equality, for a Deny resource-pattern placeholder on a column that holds no text, compared as in 5.1.0. It lowers only negated: a coarser database equality can hide a row there but never show one.
	NATIVE = "native",
	// The column holds a number and the value is a decimal.
	NUMERIC = "numeric",
	// Code-point equality of text: letter case, accents and trailing spaces count.
	TEXT = "text",
	// Code-point equality of text after folding A-Z to a-z on both sides; the values are folded already.
	TEXT_IGNORE_CASE = "text-ignore-case",
}
