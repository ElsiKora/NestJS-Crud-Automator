import type { IApiBaseEntity } from "@interface/api-base-entity.interface";

export interface IApiFunctionProperties<E extends IApiBaseEntity> {
	entity: new (...arguments_: Array<any>) => E;
}
