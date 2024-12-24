import type { Type } from "@nestjs/common";

import type { EApiDtoType, EApiRouteType } from "../../../../../../enum";

import type { IApiControllerPropertiesRouteBase } from "./base.interface";

export interface IApiControllerPropertiesRouteWithDto<E, R extends EApiRouteType> extends IApiControllerPropertiesRouteBase<E, R> {
	autoDto?: never;
	dto?: Partial<Record<EApiDtoType, Type<unknown>>>;
}
