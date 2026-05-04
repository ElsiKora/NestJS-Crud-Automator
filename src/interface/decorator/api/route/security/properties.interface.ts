import type { IApiRouteAuthenticationProperties } from "./authentication-properties.interface";
import type { IApiRouteAuthorizationProperties } from "./authorization-properties.interface";

export interface IApiRouteSecurityProperties {
	authentication?: IApiRouteAuthenticationProperties;
	authorization?: IApiRouteAuthorizationProperties;
}
