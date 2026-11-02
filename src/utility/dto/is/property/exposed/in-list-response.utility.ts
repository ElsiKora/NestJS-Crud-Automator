import type { CanActivate, Type } from "@nestjs/common";
import type { TApiPropertyDescribeDtoProperties, TApiPropertyDescribeProperties } from "@type/decorator/api/property";

import { EApiDtoType, EApiRouteType } from "@enum/decorator/api";
import { DtoGetDecoratorConfig } from "@utility/dto/get/decorator-config.utility";
import { DtoIsPropertyShouldBeMarked } from "@utility/dto/is/property/should-be-marked.utility";

/**
 * Determines whether the generated GET_LIST response DTO carries a property's value for the route guard.
 * The property must be marked for the response, enabled, and exposed as a response value; `isExpose: false` keeps it out of the wire.
 * Client ordering and CURSOR order fields share this rule, so a list is never ordered by a value its response hides.
 * @param {string} propertyName - The name of the property
 * @param {TApiPropertyDescribeProperties} propertyMetadata - The property's metadata
 * @param {boolean} isPrimary - Whether the property is a primary key
 * @param {Type<CanActivate>} [currentGuard] - Route guard that decides guard-scoped response visibility
 * @returns {boolean} True if the generated list response exposes the property's value, false otherwise
 */
export function DtoIsPropertyExposedInListResponse(propertyName: string, propertyMetadata: TApiPropertyDescribeProperties, isPrimary: boolean, currentGuard?: Type<CanActivate>): boolean {
	const config: TApiPropertyDescribeDtoProperties = DtoGetDecoratorConfig(EApiRouteType.GET_LIST, propertyMetadata, EApiDtoType.RESPONSE);

	return DtoIsPropertyShouldBeMarked(EApiRouteType.GET_LIST, EApiDtoType.RESPONSE, propertyName, propertyMetadata, isPrimary, currentGuard) && config.isEnabled !== false && config.isResponse === true && config.isExpose === true;
}
