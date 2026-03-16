import type { EApiRouteType } from "@enum/decorator/api";
import type { IApiControllerPropertiesRouteAuthentication, IApiControllerPropertiesRouteBaseRequest, IApiControllerPropertiesRouteBaseResponse } from "@interface/decorator/api";

import type { IApiControllerRouteAuthorizationProperties } from "./authorization.interface";

export interface IApiControllerPropertiesRouteBase<E, R extends EApiRouteType> {
	authentication?: IApiControllerPropertiesRouteAuthentication;
	authorization?: IApiControllerRouteAuthorizationProperties;
	decorators?: Array<MethodDecorator> | Array<PropertyDecorator>;
	isEnabled?: boolean;
	request?: IApiControllerPropertiesRouteBaseRequest<E, R>;
	response?: IApiControllerPropertiesRouteBaseResponse<E, R>;
	shouldWriteToController?: boolean;
}
