import type { EApiRouteType } from "@enum/decorator/api";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { TApiControllerPropertiesRoute } from "@type/decorator/api/controller";

export interface IApiControllerProperties<E> {
	entity: IApiBaseEntity;
	name?: string;
	path?: string;
	routes: {
		[R in EApiRouteType]?: TApiControllerPropertiesRoute<E, R>;
	};
}
