import type { IApiResponseType } from "@interface/decorator/api/response-type.interface";
import type { HttpStatus, Type } from "@nestjs/common";
import type { TTypeDiscriminator } from "@type/decorator/api/property";

import type { IApiRouteResponseSerializationProperties } from "./serialization-properties.interface";

export interface IApiRouteResponseProperties {
	discriminator?: TTypeDiscriminator;
	errors?: IApiResponseType;
	serialization?: IApiRouteResponseSerializationProperties;
	status: HttpStatus;
	type: Array<Type<unknown>> | Type<unknown> | undefined;
}
