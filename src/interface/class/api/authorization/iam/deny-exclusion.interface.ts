import type { IApiAuthorizationIamResourceRows } from "@interface/class/api/authorization/iam/resource-rows.interface";
import type { IApiPolicyStatement } from "@interface/class/api/authorization/policy/document/statement.interface";

export interface IApiAuthorizationIamDenyExclusion {
	// Rows the target of the statement applies to; every row when absent.
	resourceRows?: IApiAuthorizationIamResourceRows;
	statement: IApiPolicyStatement;
}
