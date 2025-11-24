import type { EApiDtoType, EApiRouteType } from "@enum/decorator/api";

export interface IDtoAutoContextMetadata {
	dtoType: EApiDtoType;
	method: EApiRouteType;
}
