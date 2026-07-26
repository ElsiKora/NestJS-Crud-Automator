import type { IApiPolicyAttachment } from "@interface/class/api/authorization/policy/attachment/interface";

export interface IApiResolvedPolicyAttachments {
	attachments: ReadonlyArray<IApiPolicyAttachment>;
	boundaries: ReadonlyArray<IApiPolicyAttachment>;
}
