import type { CanActivate, NestInterceptor, Type } from "@nestjs/common";

export interface IApiRouteExecutionProperties {
	guards?: Array<CanActivate | Type<CanActivate>>;
	interceptors?: Array<NestInterceptor | Type<NestInterceptor>>;
}
