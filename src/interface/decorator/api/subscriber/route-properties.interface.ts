import type { EApiRouteType } from "@enum/decorator/api";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";

export interface IApiRouteSubscriberProperties<E extends IApiBaseEntity> {
	actions?: Array<string>;
	controllers?: Array<(() => new (...arguments_: Array<unknown>) => unknown) | (new (...arguments_: Array<unknown>) => unknown)>;
	entity: new (...arguments_: Array<unknown>) => E;
	priority?: number;
	routes?: Array<EApiRouteType>;
}
