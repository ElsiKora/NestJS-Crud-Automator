import type { IApiPolicyStatement } from "@interface/class/api/authorization/policy/document/statement.interface";

export interface IApiPolicyDocument {
	Statement: ReadonlyArray<IApiPolicyStatement>;
	Version: string;
}
