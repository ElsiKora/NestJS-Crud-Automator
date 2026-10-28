import type { IApiAuthorizationIamResourceConstraint } from "@interface/class/api/authorization/iam/resource-constraint.interface";
import type { IApiPolicyStatement } from "@interface/class/api/authorization/policy/document/statement.interface";

export interface IApiAuthorizationIamDenyExclusion {
	resourceConstraints: ReadonlyArray<IApiAuthorizationIamResourceConstraint>;
	statement: IApiPolicyStatement;
}
