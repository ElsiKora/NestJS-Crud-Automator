import type { IApiAuthenticationRequest } from "@interface/api/authentication-request.interface";

import type { IApiAuthorizationPrincipal } from "./interface";

export interface IApiAuthorizationPrincipalResolver {
	resolve(user: unknown, authenticationRequest?: IApiAuthenticationRequest): IApiAuthorizationPrincipal | Promise<IApiAuthorizationPrincipal>;
}
