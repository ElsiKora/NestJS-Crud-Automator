import type { EApiDtoType, EApiRouteType } from "@enum/decorator/api";

export type TDtoGenerateAllowedCombinations = {
	[EApiRouteType.CREATE]: EApiDtoType.BODY | EApiDtoType.RESPONSE;
	[EApiRouteType.DELETE]: EApiDtoType.REQUEST;
	[EApiRouteType.GET_LIST]: EApiDtoType.QUERY | EApiDtoType.RESPONSE;
	[EApiRouteType.GET]: EApiDtoType.REQUEST | EApiDtoType.RESPONSE;
	[EApiRouteType.PARTIAL_UPDATE]: EApiDtoType.BODY | EApiDtoType.REQUEST | EApiDtoType.RESPONSE;
	[EApiRouteType.UPDATE]: EApiDtoType.BODY | EApiDtoType.REQUEST | EApiDtoType.RESPONSE;
};
