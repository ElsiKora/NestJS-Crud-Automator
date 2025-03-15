import { EApiDtoType, EApiRouteType } from "../../enum";
export const DtoIsShouldBeGenerated = (method, dtoType) => {
    switch (dtoType) {
        case EApiDtoType.BODY: {
            return [EApiRouteType.CREATE, EApiRouteType.PARTIAL_UPDATE, EApiRouteType.UPDATE].includes(method);
        }
        case EApiDtoType.QUERY: {
            return method === EApiRouteType.GET_LIST;
        }
        case EApiDtoType.REQUEST: {
            return [EApiRouteType.DELETE, EApiRouteType.GET, EApiRouteType.PARTIAL_UPDATE, EApiRouteType.UPDATE].includes(method);
        }
        case EApiDtoType.RESPONSE: {
            return method !== EApiRouteType.DELETE;
        }
        default: {
            return false;
        }
    }
};
//# sourceMappingURL=is-should-be-generated.utility.js.map