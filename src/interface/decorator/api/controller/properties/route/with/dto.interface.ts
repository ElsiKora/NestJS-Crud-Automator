import type { EApiDtoType, EApiRouteType } from "@enum/decorator/api";
import type { IApiControllerPropertiesRouteBase } from "@interface/decorator/api/controller/properties/route/base";
import type { IApiControllerPropertiesRouteGetListResponseDtoConfig } from "@interface/decorator/api/controller/properties/route/list-response-dto-config.interface";
import type { Type } from "@nestjs/common";

export interface IApiControllerPropertiesRouteWithDto<E, R extends EApiRouteType> extends IApiControllerPropertiesRouteBase<E, R> {
	autoDto?: never;
	dto?: TApiControllerPropertiesRouteDto<R>;
}

type TApiControllerPropertiesRouteDto<R extends EApiRouteType> = Partial<
	{
		[EApiDtoType.RESPONSE]: R extends EApiRouteType.GET_LIST ? IApiControllerPropertiesRouteGetListResponseDtoConfig | Type<unknown> : Type<unknown>;
	} & Record<EApiDtoType.BODY | EApiDtoType.QUERY | EApiDtoType.REQUEST, Type<unknown>>
>;
