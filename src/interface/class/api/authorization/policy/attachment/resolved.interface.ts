import type { IApiPolicyAttachment } from "./interface";

export interface IApiResolvedPolicyAttachments {
	attachments: ReadonlyArray<IApiPolicyAttachment>;
	boundaries: ReadonlyArray<IApiPolicyAttachment>;
}
