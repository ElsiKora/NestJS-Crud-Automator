import type { Type } from "@nestjs/common";
import type { IAuthGuard } from "@nestjs/passport";
import type { TApiPropertyDescribeDtoProperties, TApiPropertyDescribeProperties } from "@type/decorator/api/property";

import { EApiDtoType, EApiPropertyDescribeType, EApiRouteType } from "@enum/decorator/api";
import { DtoIsPropertyExposedForGuard } from "@utility/dto/is-property-exposed-for-guard.utility";

/**
 * Determines if a property should be marked for inclusion in a specific DTO type
 * @param {EApiRouteType} method - The API route type (GET, POST, etc.)
 * @param {EApiDtoType} dtoType - The DTO type (request, response, etc.)
 * @param {string} propertyName - The name of the property
 * @param {TApiPropertyDescribeProperties} propertyMetadata - The property's metadata
 * @param {boolean} isPrimary - Whether the property is a primary key
 * @param {Type<IAuthGuard>} currentGuard - The current authentication guard
 * @returns {boolean} True if the property should be marked, false otherwise
 */
export function DtoIsPropertyShouldBeMarked(method: EApiRouteType, dtoType: EApiDtoType, propertyName: string, propertyMetadata: TApiPropertyDescribeProperties, isPrimary: boolean, currentGuard?: Type<IAuthGuard>): boolean {
	const isDateField: boolean = ["createdAt", "receivedAt", "updatedAt"].includes(propertyName);

	if (method === EApiRouteType.CREATE && dtoType === EApiDtoType.BODY && isDateField) {
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

	if (dtoType === EApiDtoType.REQUEST && isPrimary) {
		return true;
	}

	if ((dtoType === EApiDtoType.QUERY || dtoType === EApiDtoType.BODY) && !isPrimary) {
		return true;
	}

	return dtoType !== EApiDtoType.REQUEST && dtoType !== EApiDtoType.QUERY && dtoType !== EApiDtoType.BODY;
}
