import type { HttpStatus, RequestMethod, Type } from "@nestjs/common";

import type { EApiAction } from "../../../../enum";
import type { IApiControllerPropertiesRouteAuthentication } from "../controller";
import type { IApiResponseType } from "../response-type.interface";

import type { IApiMethodThrottlerProperties } from "./throttler-properties.interface";

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
