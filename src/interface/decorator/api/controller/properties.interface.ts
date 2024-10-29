import type { EApiRouteType } from "../../../../enum";
import type { TApiControllerPropertiesRoute } from "../../../../type";
import type { IApiBaseEntity } from "../../../api-base-entity.interface";

export interface IApiControllerProperties<E> {
	entity: IApiBaseEntity;
	name?: string;
	path?: string;
	routes: {
		[R in EApiRouteType]?: TApiControllerPropertiesRoute<E, R>;
	};
}
