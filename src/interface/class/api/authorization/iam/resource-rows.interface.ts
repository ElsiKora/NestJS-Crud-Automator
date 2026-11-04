import type { IApiAuthorizationIamResourceConstraint } from "@interface/class/api/authorization/iam/resource-constraint.interface";

/**
 * The rows a `Resource` or `NotResource` target of a statement applies to on a list.
 */
export interface IApiAuthorizationIamResourceRows {
	// One set per pattern; a row matches a pattern when it meets every constraint of its set.
	constraintSets: ReadonlyArray<ReadonlyArray<IApiAuthorizationIamResourceConstraint>>;
	// Whether the target is `NotResource`: it applies to the rows that match no pattern.
	isNegated: boolean;
}
