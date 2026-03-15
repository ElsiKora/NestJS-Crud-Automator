import type { IApiAuthorizationPrincipal } from "../../principal/interface";

import type { IApiResolvedPolicyAttachments } from "./resolved.interface";

export interface IApiPolicyAttachmentSource {
	getAttachments(principal: IApiAuthorizationPrincipal): Promise<IApiResolvedPolicyAttachments>;
}
