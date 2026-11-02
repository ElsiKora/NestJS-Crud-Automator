import type { EApiDtoType, EApiRouteType } from "@enum/decorator/api";
import type { IApiControllerPropertiesRouteAutoDtoConfig } from "@interface/decorator/api";
import type { Type } from "@nestjs/common";

export interface IDtoGenerateCacheKey {
	controllerName?: string;
	dtoConfig?: IApiControllerPropertiesRouteAutoDtoConfig;
	dtoType: EApiDtoType;
	entityName: string;
	guardName?: string;
	listResponseDto?: ReadonlyArray<Type<unknown>> | Type<unknown>;
	method: EApiRouteType;
	queryPlanSignature?: string;
	responseVariantName?: string;
	routeName?: string;
}
