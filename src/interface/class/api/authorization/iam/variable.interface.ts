/**
 * A `${root.path}` or `${root.path, 'default'}` variable of an IAM pattern or condition value.
 */
export interface IApiAuthorizationIamVariable {
	// Text the variable takes when its path does not resolve to a value.
	defaultValue?: string;
	// Context path, such as `principal.attributes.tenantId`.
	path: string;
}
