import type { EApiRouteType } from "@enum/decorator/api";
import type { IApiControllerPropertiesRouteWithAutoDto, IApiControllerPropertiesRouteWithDto } from "@interface/decorator/api";
import type { TApiControllerGetListQueryDtoContract } from "@type/decorator/api/controller/get-list/query";

import type { TApiControllerPropertiesRouteWithoutRead, TApiControllerPropertiesRouteWithRead } from "./read";

export type TApiControllerPropertiesRouteContract<E, R extends EApiRouteType> =
	| (R extends EApiRouteType.GET | EApiRouteType.GET_LIST ? TApiControllerPropertiesRouteWithRead<E, IApiControllerPropertiesRouteWithAutoDto<E, R> | (R extends EApiRouteType.GET_LIST ? TApiControllerGetListQueryDtoContract<E> : IApiControllerPropertiesRouteWithDto<E, R>)> : never)
	| TApiControllerPropertiesRouteWithoutRead<IApiControllerPropertiesRouteWithAutoDto<E, R>>
	| TApiControllerPropertiesRouteWithoutRead<R extends EApiRouteType.GET_LIST ? TApiControllerGetListQueryDtoContract<E> : IApiControllerPropertiesRouteWithDto<E, R>>;
