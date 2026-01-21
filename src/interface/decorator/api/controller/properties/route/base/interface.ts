import type { EApiRouteType } from "@enum/decorator/api";
import type { IApiControllerPropertiesRouteAuthentication, IApiControllerPropertiesRouteBaseRequest, IApiControllerPropertiesRouteBaseResponse } from "@interface/decorator/api";

export interface IApiControllerPropertiesRouteBase<E, R extends EApiRouteType> {
	authentication?: IApiControllerPropertiesRouteAuthentication;
	decorators?: Array<MethodDecorator> | Array<PropertyDecorator>;
	isEnabled?: boolean;
	request?: IApiControllerPropertiesRouteBaseRequest<E, R>;
	response?: IApiControllerPropertiesRouteBaseResponse<E, R>;
	shouldWriteToController?: boolean;
}
