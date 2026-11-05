/**
 * One part of a resource string: a literal, or a placeholder a row fills.
 */
export interface IApiAuthorizationIamResourceSegment {
	placeholder?: string;
	// Set on a placeholder read on the stored row: the query path of the text column it compares, or no query path when the placeholder resolves to no column, so a pattern that constrains it fails closed.
	storedRow?: { queryPath?: string };
	value: string;
}
