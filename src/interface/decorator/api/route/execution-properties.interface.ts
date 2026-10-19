import type { IApiRouteGuardProperties } from "@interface/decorator/api/route/guard-properties.interface";
import type { CanActivate, NestInterceptor, Type } from "@nestjs/common";

export interface IApiRouteExecutionProperties {
	guards?: Array<CanActivate | IApiRouteGuardProperties | Type<CanActivate>>;
	interceptors?: Array<NestInterceptor | Type<NestInterceptor>>;
}
