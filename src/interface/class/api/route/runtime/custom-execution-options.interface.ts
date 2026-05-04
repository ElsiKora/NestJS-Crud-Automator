import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiRouteMetadata, IApiRouteRuntimeProperties } from "@interface/decorator/api";
import type { ExecutionContext } from "@nestjs/common";

export interface IApiRouteRuntimeCustomExecutionOptions<E extends IApiBaseEntity, R> {
	executionContext: ExecutionContext;
	metadata: IApiRouteMetadata<E>;
	operation: () => Promise<R>;
	runtimeProperties: IApiRouteRuntimeProperties<E>;
}
