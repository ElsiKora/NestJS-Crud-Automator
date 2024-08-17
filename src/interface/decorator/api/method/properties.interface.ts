import type { IApiMethodThrottlerProperties } from "./throttler-properties.interface";
import type { EApiAction, EApiAuthenticationType } from "../../../../enum";
import type { IApiResponseType } from "../response-type.interface";
import type { HttpStatus, RequestMethod, Type } from "@nestjs/common";

export interface IApiMethodProperties<T> {
	action?: EApiAction;
	authentication?: EApiAuthenticationType;
	description?: string;
	entity: T;
	httpCode: HttpStatus;
	method: RequestMethod;
	path: string;
	responses?: IApiResponseType;
	responseType: Type<unknown> | undefined;
	throttler?: IApiMethodThrottlerProperties;
}
