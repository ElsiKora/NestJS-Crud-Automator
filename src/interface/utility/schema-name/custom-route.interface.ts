import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiRouteMetadata, IApiRouteRuntimeProperties } from "@interface/decorator/api";

export interface IDtoSchemaNameCustomRoute<E extends IApiBaseEntity> {
	// Swagger metadata entries the request DTOs added to the handler, per metadata key, so they can be removed from a copy of the handler.
	contribution: Record<string, Array<unknown>>;
	metadata: IApiRouteMetadata<E>;
	runtimeProperties: IApiRouteRuntimeProperties<E, undefined>;
}
