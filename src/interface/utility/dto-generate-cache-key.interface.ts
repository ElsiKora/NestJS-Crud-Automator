import type { EApiDtoType, EApiRouteType } from "@enum/decorator/api";
import type { IApiControllerPropertiesRouteAutoDtoConfig } from "@interface/decorator/api";
import type { CanActivate, Type } from "@nestjs/common";
import type { TMetadataStorageTarget } from "@type/class";

export interface IDtoGenerateCacheKey {
	controllerName?: string;
	dtoConfig?: IApiControllerPropertiesRouteAutoDtoConfig;
	dtoType: EApiDtoType;
	entity: TMetadataStorageTarget;
	guard?: Type<CanActivate>;
	listResponseDto?: ReadonlyArray<Type<unknown>> | Type<unknown>;
	method: EApiRouteType;
	queryPlanSignature?: string;
	responseVariantName?: string;
	routeName?: string;
}
