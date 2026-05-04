import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiRouteMetadata, IApiRouteRuntimeProperties } from "@interface/decorator/api";
import type { CallHandler, ExecutionContext, NestInterceptor } from "@nestjs/common";
import type { Observable } from "rxjs";

import { ApiRouteRuntime } from "@class/api/route-runtime.class";
import { METHOD_API_DECORATOR_CONSTANT } from "@constant/decorator/api";
import { Injectable } from "@nestjs/common";
import { from, lastValueFrom } from "rxjs";

@Injectable()
export class ApiRouteRuntimeInterceptor implements NestInterceptor {
	public intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		const metadata: IApiRouteMetadata<IApiBaseEntity> | undefined = Reflect.getMetadata(METHOD_API_DECORATOR_CONSTANT.ROUTE_METADATA_KEY, context.getHandler()) as IApiRouteMetadata<IApiBaseEntity> | undefined;
		const runtimeProperties: IApiRouteRuntimeProperties<IApiBaseEntity> | undefined = Reflect.getMetadata(METHOD_API_DECORATOR_CONSTANT.ROUTE_RUNTIME_PROPERTIES_METADATA_KEY, context.getHandler()) as IApiRouteRuntimeProperties<IApiBaseEntity> | undefined;

		if (!metadata) {
			return next.handle();
		}

		return from(
			ApiRouteRuntime.executeCustom({
				executionContext: context,
				metadata,
				operation: async (): Promise<unknown> => await lastValueFrom(next.handle()),
				runtimeProperties: runtimeProperties ?? {},
			}),
		);
	}
}
