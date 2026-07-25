import type { IApiRouteAuthenticationProperties } from "@interface/decorator/api/route/security/authentication-properties.interface";
import type { IApiRouteAuthorizationProperties } from "@interface/decorator/api/route/security/authorization-properties.interface";

export interface IApiRouteSecurityProperties {
	authentication?: IApiRouteAuthenticationProperties;
	authorization?: IApiRouteAuthorizationProperties;
}
