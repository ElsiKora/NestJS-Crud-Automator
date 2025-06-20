import type { IApiBaseEntity } from "@interface/api-base-entity.interface";

export interface IApiFunctionSubscriberProperties<E extends IApiBaseEntity> {
	entity: new (...arguments_: Array<unknown>) => E;
	priority?: number;
}
