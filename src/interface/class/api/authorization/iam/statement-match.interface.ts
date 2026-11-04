import type { IApiAuthorizationIamDenyExclusion } from "@interface/class/api/authorization/iam/deny-exclusion.interface";
import type { IApiAuthorizationIamResourceRows } from "@interface/class/api/authorization/iam/resource-rows.interface";

export interface IApiAuthorizationIamStatementMatch {
	exclusions?: Array<IApiAuthorizationIamDenyExclusion>;
	isMatched: boolean;
	// Rows a matched Allow applies to on a list; every row when absent.
	resourceRows?: IApiAuthorizationIamResourceRows;
}
