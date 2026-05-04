import type { IApiResponseType } from "@interface/decorator/api/response-type.interface";
import type { HttpStatus, Type } from "@nestjs/common";

import type { IApiRouteResponseSerializationProperties } from "./serialization-properties.interface";

export interface IApiRouteResponseProperties {
	errors?: IApiResponseType;
	serialization?: IApiRouteResponseSerializationProperties;
	status: HttpStatus;
	type: Type<unknown> | undefined;
}
