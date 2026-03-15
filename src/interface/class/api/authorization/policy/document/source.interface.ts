import type { IApiPolicyDocumentRecord } from "./record.interface";

export interface IApiPolicyDocumentSource {
	getDocumentsByIds(ids: ReadonlyArray<string>): Promise<ReadonlyArray<IApiPolicyDocumentRecord>>;
}
