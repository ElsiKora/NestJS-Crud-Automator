import type { IApiPolicyStatement } from "./statement.interface";

export interface IApiPolicyDocument {
	Statement: ReadonlyArray<IApiPolicyStatement>;
	Version: string;
}
