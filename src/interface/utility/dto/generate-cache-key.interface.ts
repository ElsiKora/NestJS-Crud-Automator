import type { EApiDtoType, EApiRouteType } from "@enum/decorator/api";
import type { IApiControllerPropertiesRouteAutoDtoConfig } from "@interface/decorator/api";

export interface IDtoGenerateCacheKey {
	dtoConfig?: IApiControllerPropertiesRouteAutoDtoConfig;
	dtoType: EApiDtoType;
	entityName: string;
	guardName?: string;
	method: EApiRouteType;
}
