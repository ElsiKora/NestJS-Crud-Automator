import type { EApiAction } from "@enum/decorator/api";
import type { IApiControllerPropertiesRouteAuthentication, IApiMethodThrottlerProperties, IApiResponseType } from "@interface/decorator/api";
import type { HttpStatus, RequestMethod, Type } from "@nestjs/common";

export interface IApiMethodProperties<T> {
	action?: EApiAction;
	authentication?: IApiControllerPropertiesRouteAuthentication;
	description?: string;
	entity: T;
	httpCode: HttpStatus;
	method: RequestMethod;
	path: string;
	responses?: IApiResponseType;
	responseType: Type<unknown> | undefined;
	throttler?: IApiMethodThrottlerProperties;
}
