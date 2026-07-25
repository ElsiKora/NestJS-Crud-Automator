import type { IApiPolicyDocumentRecord } from "@interface/class/api/authorization/policy/document/record.interface";

export interface IApiPolicyDocumentSource {
	getDocumentsByIds(ids: ReadonlyArray<string>): Promise<ReadonlyArray<IApiPolicyDocumentRecord>>;
}
