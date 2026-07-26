import type { EApiPolicySourceType } from "@enum/class/authorization";
import type { IApiPolicyDocument } from "@interface/class/api/authorization/policy/document/interface";

export interface IApiPolicyDocumentRecord {
	document: IApiPolicyDocument;
	id: string;
	namespace: string;
	sourceType: EApiPolicySourceType;
	version: string;
}
