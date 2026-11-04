import type { EApiAuthorizationIamSupport } from "@enum/class/authorization";

/**
 * One entry of the IAM context-key registry: a context path and what the grammar takes it for.
 */
export interface IApiAuthorizationIamContextKey {
	// Whether the path can hold a list, so a `ForAnyValue:` or `ForAllValues:` qualifier applies to it.
	isMultiValued: boolean;
	// Whether the entry covers every sub path of `path` instead of `path` itself.
	isPrefix: boolean;
	// Whether the path is taken as a condition key.
	key: EApiAuthorizationIamSupport;
	// Context path, such as `principal.id`, or the root of a prefix entry, such as `principal.attributes`.
	path: string;
	// Whether the path is taken as a variable in a `Resource` pattern.
	resource: EApiAuthorizationIamSupport;
	// Whether the path is taken as a variable in a condition value.
	value: EApiAuthorizationIamSupport;
}
