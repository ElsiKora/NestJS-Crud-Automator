import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiRouteMetadata } from "@interface/decorator/api/route/metadata";
import type { IApiRouteRuntimeProperties } from "@interface/decorator/api/route/runtime-properties.interface";

export interface IApiRouteCustomProperties<E extends IApiBaseEntity> extends Omit<IApiRouteMetadata<E>, "response">, Omit<IApiRouteRuntimeProperties<E, undefined>, "response"> {
	response?: NonNullable<IApiRouteMetadata<E>["response"]> & NonNullable<IApiRouteRuntimeProperties<E, undefined>["response"]>;
}
