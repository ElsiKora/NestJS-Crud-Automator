import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiRouteMetadata } from "@interface/decorator/api/route";

export interface IApiMethodProperties<E extends IApiBaseEntity> {
	metadata: IApiRouteMetadata<E>;
}
