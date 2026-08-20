import type { EApiControllerRequestTarget, EApiDtoType, EApiRouteType } from "@enum/decorator/api";
import type { IApiControllerPropertiesRouteBaseRequestTarget, IApiControllerPropertiesRouteWithDto } from "@interface/decorator/api";
import type { Type } from "@nestjs/common";

export type TApiControllerGetListQueryDtoContract<E> = (
	| {
			dto: Record<EApiDtoType.QUERY, Type<unknown>>;
			request?: {
				[EApiControllerRequestTarget.QUERY]?: {
					filter?: never;
					order?: never;
					pagination?: never;
				} & IApiControllerPropertiesRouteBaseRequestTarget<E>;
			};
	  }
	| {
			dto?: Partial<Record<EApiDtoType.QUERY, never>>;
	  }
) &
	IApiControllerPropertiesRouteWithDto<E, EApiRouteType.GET_LIST>;
