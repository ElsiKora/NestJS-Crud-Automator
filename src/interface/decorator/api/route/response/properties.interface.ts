import type { IApiResponseType } from "@interface/decorator/api/response-type.interface";
import type { IApiRouteResponseSerializationProperties } from "@interface/decorator/api/route/response/serialization-properties.interface";
import type { HttpStatus, Type } from "@nestjs/common";
import type { HeadersObject } from "@nestjs/swagger/dist/interfaces/open-api-spec.interface";
import type { TTypeDiscriminator } from "@type/decorator/api/property";

export interface IApiRouteResponseProperties {
	discriminator?: TTypeDiscriminator;
	errors?: IApiResponseType;
	headers?: HeadersObject;
	serialization?: IApiRouteResponseSerializationProperties;
	status: HttpStatus;
	type: Array<Type<unknown>> | Type<unknown> | undefined;
}
