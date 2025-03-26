import type { EApiDtoType, EApiRouteType } from "@enum/decorator/api";
import type { IApiControllerPropertiesRouteAutoDtoConfig, IApiControllerPropertiesRouteBase } from "@interface/decorator/api";

export interface IApiControllerPropertiesRouteWithAutoDto<E, R extends EApiRouteType> extends IApiControllerPropertiesRouteBase<E, R> {
	autoDto?: Partial<Record<EApiDtoType, IApiControllerPropertiesRouteAutoDtoConfig>>;
	dto?: never;
}
