import type { IApiResponseType } from "@interface/decorator/api/response-type.interface";
import type { IApiRouteResponseSerializationProperties } from "@interface/decorator/api/route/response/serialization-properties.interface";
import type { HttpStatus, Type } from "@nestjs/common";
import type { TTypeDiscriminator } from "@type/decorator/api/property";
import type { TSwaggerHeadersObject } from "@type/swagger";

export interface IApiRouteResponseProperties {
	discriminator?: TTypeDiscriminator;
	errors?: IApiResponseType;
	headers?: TSwaggerHeadersObject;
	serialization?: IApiRouteResponseSerializationProperties;
	status: HttpStatus;
	type: Array<Type<unknown>> | Type<unknown> | undefined;
}
