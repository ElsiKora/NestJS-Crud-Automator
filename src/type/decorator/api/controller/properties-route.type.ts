import type { EApiRouteType } from "../../../../enum";
import type { IApiControllerPropertiesRouteWithAutoDto, IApiControllerPropertiesRouteWithDto } from "../../../../interface";

export type TApiControllerPropertiesRoute<E, R extends EApiRouteType> = IApiControllerPropertiesRouteWithAutoDto<E, R> | IApiControllerPropertiesRouteWithDto<E, R>;
