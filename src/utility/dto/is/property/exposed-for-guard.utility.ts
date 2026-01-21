import type { EApiDtoType, EApiRouteType } from "@enum/decorator/api";
import type { Type } from "@nestjs/common";
import type { IAuthGuard } from "@nestjs/passport";
import type { TApiPropertyDescribeDtoGuardProperties, TApiPropertyDescribeDtoProperties, TApiPropertyDescribeProperties } from "@type/decorator/api/property";

/**
 * Determines if a property should be exposed for the current authentication guard
 * @param {EApiRouteType} method - The API route type (GET, POST, etc.)
 * @param {TApiPropertyDescribeProperties} propertyMetadata - The property's metadata
 * @param {EApiDtoType} dtoType - The DTO type (request, response, etc.)
 * @param {Type<IAuthGuard>} currentGuard - The current authentication guard
 * @returns {boolean} True if the property should be exposed, false otherwise
 */
export function DtoIsPropertyExposedForGuard(method: EApiRouteType, propertyMetadata: TApiPropertyDescribeProperties, dtoType: EApiDtoType, currentGuard?: Type<IAuthGuard>): boolean {
	const properties: Record<EApiDtoType, TApiPropertyDescribeDtoProperties> | undefined = propertyMetadata.properties?.[method] as Record<EApiDtoType, TApiPropertyDescribeDtoProperties> | undefined;

	if (!properties?.[dtoType]?.guard || !currentGuard) {
		return true;
	}

	const { guards, isInverse = false }: TApiPropertyDescribeDtoGuardProperties = properties?.[dtoType]?.guard ?? {};
	const guardArray: Array<Type<IAuthGuard>> = Array.isArray(guards) ? guards : [guards];
	const isGuardMatch: boolean = guardArray.includes(currentGuard);

	return isInverse ? !isGuardMatch : isGuardMatch;
}
