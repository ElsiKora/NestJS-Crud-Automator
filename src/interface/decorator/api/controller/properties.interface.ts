import type { EApiRouteType } from "@enum/decorator/api";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { TApiControllerPropertiesRoute } from "@type/decorator/api/controller";

import type { IApiControllerAuthorizationProperties } from "./properties/authorization.interface";

export interface IApiControllerProperties<E extends IApiBaseEntity> {
	authorization?: IApiControllerAuthorizationProperties<E>;
	entity: IApiBaseEntity;
	name?: string;
	path?: string;
	routes: {
		[R in EApiRouteType]?: TApiControllerPropertiesRoute<E, R>;
	};
}
