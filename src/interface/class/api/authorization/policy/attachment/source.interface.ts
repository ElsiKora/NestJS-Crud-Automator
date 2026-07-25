import type { IApiResolvedPolicyAttachments } from "@interface/class/api/authorization/policy/attachment/resolved.interface";
import type { IApiAuthorizationPrincipal } from "@interface/class/api/authorization/principal/interface";

export interface IApiPolicyAttachmentSource {
	getAttachments(principal: IApiAuthorizationPrincipal): Promise<IApiResolvedPolicyAttachments>;
}
