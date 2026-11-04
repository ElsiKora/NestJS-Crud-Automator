import type { IApiAuthorizationIamToken } from "@interface/class/api/authorization/iam/token.interface";

/**
 * What one placeholder of a resource path must render for a row to match a pattern.
 */
export interface IApiAuthorizationIamResourceConstraint {
	// Literal, `*` and `?` tokens the rendered value must match; no tokens name the empty value, which a NULL renders.
	pattern: ReadonlyArray<IApiAuthorizationIamToken>;
	// Placeholder of the resource path.
	placeholder: string;
}
