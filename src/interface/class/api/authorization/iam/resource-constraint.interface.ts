import type { IApiAuthorizationIamToken } from "@interface/class/api/authorization/iam/token.interface";

/**
 * What one placeholder of a resource path must render for a row to match a pattern.
 */
export interface IApiAuthorizationIamResourceConstraint {
	// Literal, `*` and `?` tokens the rendered value must match; no tokens name the empty value, which a NULL renders.
	pattern: ReadonlyArray<IApiAuthorizationIamToken>;
	// Placeholder of the resource path.
	placeholder: string;
	// Set when the constraint reads the stored row of a path value: the query path of the text column it compares, or no query path when the placeholder resolves to no column, which no scope can compare.
	storedRow?: { queryPath?: string };
}
