import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiRouteExecutionProperties, IApiRouteMetadata } from "@interface/decorator/api/route";

export interface IApiMethodProperties<E extends IApiBaseEntity> {
	execution?: IApiRouteExecutionProperties;
	metadata: IApiRouteMetadata<E>;
}
