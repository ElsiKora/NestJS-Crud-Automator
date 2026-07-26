import type { IApiPolicyAttachmentSource } from "@interface/class/api/authorization/policy/attachment";
import type { IApiPolicyDocumentSource } from "@interface/class/api/authorization/policy/document";

export interface IApiAuthorizationIamModuleOptions {
	attachmentSources?: ReadonlyArray<IApiPolicyAttachmentSource>;
	documentSources?: ReadonlyArray<IApiPolicyDocumentSource>;
}
