import type { IApiAuthorizationPrincipal } from "@interface/class/api/authorization/principal/interface";

export interface IApiFunctionPrincipalStorageEntry {
	/** Deep-frozen principal of the route request, undefined on a route without authorization. */
	readonly principal: Readonly<IApiAuthorizationPrincipal> | undefined;
}
