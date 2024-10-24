import type { IApiMethodThrottlerProperties } from "./throttler-properties.interface";
import type { EApiAction } from "../../../../enum";
import type { IApiControllerPropertiesRouteAuthentication } from "../controller-properties.interface";
import type { IApiResponseType } from "../response-type.interface";
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
