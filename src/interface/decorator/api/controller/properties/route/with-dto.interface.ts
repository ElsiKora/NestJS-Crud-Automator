import type { IApiControllerPropertiesRouteBase } from "./base.interface";

import type { EApiDtoType, EApiRouteType } from "../../../../../../enum";

import type { Type } from "@nestjs/common";

export interface IApiControllerPropertiesRouteWithDto<E, R extends EApiRouteType> extends IApiControllerPropertiesRouteBase<E, R> {
	autoDto?: never;
	dto?: {
		[key in EApiDtoType]?: Type<unknown>;
	};
}
