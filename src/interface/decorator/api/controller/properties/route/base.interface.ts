import type { EApiRouteType } from "../../../../../../enum";

import type { IApiControllerPropertiesRouteAuthentication } from "./authentication.interface";
import type { IApiControllerPropertiesRouteBaseRequest } from "./base-request.interface";
import type { IApiControllerPropertiesRouteBaseResponse } from "./base-response.interface";

export interface IApiControllerPropertiesRouteBase<E, R extends EApiRouteType> {
	authentication?: IApiControllerPropertiesRouteAuthentication;
	decorators?: Array<MethodDecorator> | Array<PropertyDecorator>;
	isEnabled?: boolean;
	request?: IApiControllerPropertiesRouteBaseRequest<E, R>;
	response?: IApiControllerPropertiesRouteBaseResponse<E, R>;
}
