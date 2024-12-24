import type { EApiDtoType, EApiRouteType } from "../../../../../../enum";

import type { IApiControllerPropertiesRouteAutoDtoConfig } from "./auto-dto-config.interface";
import type { IApiControllerPropertiesRouteBase } from "./base.interface";

export interface IApiControllerPropertiesRouteWithAutoDto<E, R extends EApiRouteType> extends IApiControllerPropertiesRouteBase<E, R> {
	autoDto?: Partial<Record<EApiDtoType, IApiControllerPropertiesRouteAutoDtoConfig>>;
	dto?: never;
}
