import type { EApiDtoType, EApiRouteType } from "@enum/decorator/api";

export type TDtoGenerateAllowedCombinations = {
	[EApiRouteType.CREATE]: EApiDtoType.BODY | EApiDtoType.RESPONSE;
	[EApiRouteType.DELETE]: EApiDtoType.PARAMETERS;
	[EApiRouteType.GET_LIST]: EApiDtoType.PARAMETERS | EApiDtoType.QUERY | EApiDtoType.RESPONSE;
	[EApiRouteType.GET]: EApiDtoType.PARAMETERS | EApiDtoType.RESPONSE;
	[EApiRouteType.PARTIAL_UPDATE]: EApiDtoType.BODY | EApiDtoType.PARAMETERS | EApiDtoType.RESPONSE;
	[EApiRouteType.UPDATE]: EApiDtoType.BODY | EApiDtoType.PARAMETERS | EApiDtoType.RESPONSE;
};
