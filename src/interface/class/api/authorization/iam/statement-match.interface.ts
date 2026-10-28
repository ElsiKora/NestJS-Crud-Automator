import type { IApiAuthorizationIamDenyExclusion } from "@interface/class/api/authorization/iam/deny-exclusion.interface";

export interface IApiAuthorizationIamStatementMatch {
	exclusions?: Array<IApiAuthorizationIamDenyExclusion>;
	isMatched: boolean;
}
