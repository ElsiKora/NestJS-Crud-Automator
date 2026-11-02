import type { EApiRouteType } from "@enum/decorator/api";
import type { IApiControllerPropertiesRouteWithAutoDto, IApiControllerPropertiesRouteWithDto } from "@interface/decorator/api";
import type { TApiControllerGetListQueryDtoContract } from "@type/decorator/api/controller/get-list/query";

export type TApiControllerPropertiesRouteContract<E, R extends EApiRouteType> = IApiControllerPropertiesRouteWithAutoDto<E, R> | (R extends EApiRouteType.GET_LIST ? TApiControllerGetListQueryDtoContract<E> : IApiControllerPropertiesRouteWithDto<E, R>);
