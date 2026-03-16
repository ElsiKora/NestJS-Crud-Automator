import type { IApiPolicyAttachmentSource } from "./policy/attachment";
import type { IApiPolicyDocumentSource } from "./policy/document";

export interface IApiAuthorizationIamModuleOptions {
	attachmentSources?: ReadonlyArray<IApiPolicyAttachmentSource>;
	documentSources?: ReadonlyArray<IApiPolicyDocumentSource>;
}
