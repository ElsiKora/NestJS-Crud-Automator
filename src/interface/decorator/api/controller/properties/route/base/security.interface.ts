import type { IApiControllerPropertiesRouteAuthentication } from "@interface/decorator/api/controller/properties/route/authentication.interface";
import type { IApiControllerRouteAuthorizationProperties } from "@interface/decorator/api/controller/properties/route/base/authorization.interface";

export interface IApiControllerPropertiesRouteBaseSecurity {
	authentication?: IApiControllerPropertiesRouteAuthentication;
	authorization?: IApiControllerRouteAuthorizationProperties;
}
