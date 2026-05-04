import type { IApiControllerPropertiesRouteAuthentication } from "../authentication.interface";

import type { IApiControllerRouteAuthorizationProperties } from "./authorization.interface";

export interface IApiControllerPropertiesRouteBaseSecurity {
	authentication?: IApiControllerPropertiesRouteAuthentication;
	authorization?: IApiControllerRouteAuthorizationProperties;
}
