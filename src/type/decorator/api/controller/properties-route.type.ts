import type { EApiRouteType } from "@enum/decorator/api";
import type { IApiControllerPropertiesRouteWithAutoDto, IApiControllerPropertiesRouteWithDto } from "@interface/decorator/api";

export type TApiControllerPropertiesRoute<E, R extends EApiRouteType> = IApiControllerPropertiesRouteWithAutoDto<E, R> | IApiControllerPropertiesRouteWithDto<E, R>;
