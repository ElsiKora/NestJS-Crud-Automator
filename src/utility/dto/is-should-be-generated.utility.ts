import { EApiDtoType, EApiRouteType } from "../../enum";

export const DtoIsShouldBeGenerated = (method: EApiRouteType, dtoType: EApiDtoType): boolean => {
	switch (dtoType) {
		case EApiDtoType.RESPONSE: {
			return method !== EApiRouteType.DELETE;
		}

		case EApiDtoType.QUERY: {
			return method === EApiRouteType.GET_LIST;
		}

		case EApiDtoType.BODY: {
			return [EApiRouteType.CREATE, EApiRouteType.PARTIAL_UPDATE, EApiRouteType.UPDATE].includes(method);
		}

		case EApiDtoType.REQUEST: {
			return [EApiRouteType.DELETE, EApiRouteType.GET, EApiRouteType.PARTIAL_UPDATE, EApiRouteType.UPDATE].includes(method);
		}

		default: {
			return false;
		}
	}
};
