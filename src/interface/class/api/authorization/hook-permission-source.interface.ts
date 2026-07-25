import type { IApiAuthorizationPrincipal } from "@interface/class/api/authorization/principal";

export interface IApiHookPermissionSource {
	getPermissions(principal: IApiAuthorizationPrincipal): Promise<ReadonlyArray<string>>;
}
