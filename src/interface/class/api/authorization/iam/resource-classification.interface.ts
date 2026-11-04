import type { EApiAuthorizationIamResourceClass } from "@enum/class/authorization";
import type { IApiAuthorizationIamResourceConstraint } from "@interface/class/api/authorization/iam/resource-constraint.interface";

/**
 * What one resource pattern says about the rows of a request.
 */
export interface IApiAuthorizationIamResourceClassification {
	// Placeholder constraints of a `PARTIAL` pattern: a row matches when it meets them all.
	constraints: ReadonlyArray<IApiAuthorizationIamResourceConstraint>;
	// Class of the pattern.
	kind: EApiAuthorizationIamResourceClass;
}
