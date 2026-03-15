import type { EApiAction } from "@enum/decorator/api";
import type { IApiControllerPropertiesRouteAuthentication, IApiResponseType } from "@interface/decorator/api";
import type { HttpStatus, RequestMethod, Type } from "@nestjs/common";

import type { IApiMethodAuthorizationProperties } from "./authorization.interface";
import type { IApiMethodThrottlerProperties } from "./throttler-properties.interface";

export interface IApiMethodProperties<T> {
	action?: EApiAction;
	authentication?: IApiControllerPropertiesRouteAuthentication;
	authorization?: IApiMethodAuthorizationProperties;
	description?: string;
	entity: T;
	httpCode: HttpStatus;
	method: RequestMethod;
	path: string;
	responses?: IApiResponseType;
	responseType: Type<unknown> | undefined;
	throttler?: IApiMethodThrottlerProperties;
}
