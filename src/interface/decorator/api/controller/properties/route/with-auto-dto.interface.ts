import type { IApiControllerPropertiesRouteAutoDtoConfig } from "./auto-dto-config.interface";
import type { IApiControllerPropertiesRouteBase } from "./base.interface";
import type { EApiDtoType, EApiRouteType } from "../../../../../../enum";

export interface IApiControllerPropertiesRouteWithAutoDto<E, R extends EApiRouteType> extends IApiControllerPropertiesRouteBase<E, R> {
	autoDto?: {
		[key in EApiDtoType]?: IApiControllerPropertiesRouteAutoDtoConfig;
	};
	dto?: never;
}
