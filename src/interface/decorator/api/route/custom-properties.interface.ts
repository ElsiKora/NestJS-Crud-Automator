import type { IApiBaseEntity } from "@interface/api-base-entity.interface";

import type { IApiRouteMetadata } from "./metadata";
import type { IApiRouteRuntimeProperties } from "./runtime-properties.interface";

export interface IApiRouteCustomProperties<E extends IApiBaseEntity> extends Omit<IApiRouteMetadata<E>, "response">, Omit<IApiRouteRuntimeProperties<E, undefined>, "response"> {
	response?: IApiRouteMetadata<E>["response"] & IApiRouteRuntimeProperties<E, undefined>["response"];
}
