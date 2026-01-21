import type { EApiDtoType, EApiRouteType } from "@enum/decorator/api";
import type { IApiControllerPropertiesRouteBase } from "@interface/decorator/api/controller/properties/route/base";
import type { Type } from "@nestjs/common";

export interface IApiControllerPropertiesRouteWithDto<E, R extends EApiRouteType> extends IApiControllerPropertiesRouteBase<E, R> {
	autoDto?: never;
	dto?: Partial<Record<EApiDtoType, Type<unknown>>>;
}
