import type { IApiBaseEntity } from "@interface/api-base-entity.interface";

export interface IApiRouteSubscriberProperties<E extends IApiBaseEntity> {
	entity: new (...args: Array<any>) => E;
	priority?: number;
} 