import type { EApiPolicySourceType } from "@enum/class/authorization";

import type { IApiPolicyDocument } from "./interface";

export interface IApiPolicyDocumentRecord {
	document: IApiPolicyDocument;
	id: string;
	namespace: string;
	sourceType: EApiPolicySourceType;
	version: string;
}
