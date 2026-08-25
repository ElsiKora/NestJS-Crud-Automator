import type { CanActivate, Type } from "@nestjs/common";
import type { TApiPropertyDescribeDtoProperties, TApiPropertyDescribeProperties } from "@type/decorator/api/property";

import { EApiDtoType, EApiPropertyDescribeType, EApiRouteType } from "@enum/decorator/api";
import { DtoIsPropertyExposedForGuard } from "@utility/dto/is/property/exposed-for-guard.utility";
import { DtoIsPropertyInfrastructureTimestamp } from "@utility/dto/is/property/infrastructure-timestamp.utility";

/**
 * Determines if a property should be marked for inclusion in a specific DTO type
 * @param {EApiRouteType} method - The API route type (GET, POST, etc.)
 * @param {EApiDtoType} dtoType - The DTO type (request, response, etc.)
 * @param {string} _propertyName - The name of the property
 * @param {TApiPropertyDescribeProperties} propertyMetadata - The property's metadata
 * @param {boolean} isPrimary - Whether the property is a primary key
 * @param {Type<CanActivate>} currentGuard - The current authentication guard
 * @returns {boolean} True if the property should be marked, false otherwise
 */
export function DtoIsPropertyShouldBeMarked(method: EApiRouteType, dtoType: EApiDtoType, _propertyName: string, propertyMetadata: TApiPropertyDescribeProperties, isPrimary: boolean, currentGuard?: Type<CanActivate>): boolean {
	if (propertyMetadata.isAutoDtoEnabled === false) {
		return false;
	}

	const isWriteBody: boolean = dtoType === EApiDtoType.BODY && (method === EApiRouteType.CREATE || method === EApiRouteType.UPDATE || method === EApiRouteType.PARTIAL_UPDATE);

	if (isWriteBody && DtoIsPropertyInfrastructureTimestamp(propertyMetadata)) {
		return false;
	}

	const properties: Record<EApiDtoType, TApiPropertyDescribeDtoProperties> | undefined = propertyMetadata.properties?.[method] as Record<EApiDtoType, TApiPropertyDescribeDtoProperties> | undefined;

	if (properties?.[dtoType]?.isEnabled === false) {
		return false;
	}

	if (!DtoIsPropertyExposedForGuard(method, propertyMetadata, dtoType, currentGuard)) {
		return false;
	}

	if (dtoType === EApiDtoType.QUERY && propertyMetadata.type === EApiPropertyDescribeType.OBJECT) {
		return false;
	}

	if (dtoType === EApiDtoType.PARAMETERS && isPrimary) {
		return true;
	}

	if ((dtoType === EApiDtoType.QUERY || dtoType === EApiDtoType.BODY) && !isPrimary) {
		return true;
	}

	return dtoType !== EApiDtoType.PARAMETERS && dtoType !== EApiDtoType.QUERY && dtoType !== EApiDtoType.BODY;
}
