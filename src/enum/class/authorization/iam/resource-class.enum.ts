/**
 * What a `Resource` or `NotResource` pattern says about the rows of a request.
 */
export enum EApiAuthorizationIamResourceClass {
	// Every row matches, whatever its placeholders hold.
	ALL = "all",
	// Some rows may match, and no one pattern per placeholder says which: it fails closed.
	AMBIGUOUS = "ambiguous",
	// No row can match.
	NONE = "none",
	// The rows whose placeholders match one pattern each.
	PARTIAL = "partial",
}
