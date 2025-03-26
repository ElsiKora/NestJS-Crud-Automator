import { EApiDtoType, EApiRouteType } from "@enum/decorator/api";

/**
 * Determines if a DTO should be generated for a given route method and DTO type.
 * Makes logical decisions based on combinations, for example:
 * - BODY DTOs only for CREATE/UPDATE routes
 * - QUERY DTOs only for GET_LIST routes
 * - RESPONSE DTOs for all routes except DELETE
 * @param {EApiRouteType} method - The API route type (CREATE, DELETE, GET, etc.)
 * @param {EApiDtoType} dtoType - The type of DTO (REQUEST, RESPONSE, etc.)
 * @returns {boolean} True if a DTO should be generated, false otherwise
 */
export const DtoIsShouldBeGenerated = (method: EApiRouteType, dtoType: EApiDtoType): boolean => {
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
