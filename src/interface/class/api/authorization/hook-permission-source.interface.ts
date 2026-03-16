import type { IApiAuthorizationPrincipal } from "./principal";

export interface IApiHookPermissionSource {
	getPermissions(principal: IApiAuthorizationPrincipal): Promise<ReadonlyArray<string>>;
}
