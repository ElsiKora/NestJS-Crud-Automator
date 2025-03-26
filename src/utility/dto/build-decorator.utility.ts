import type { EApiPropertyDateIdentifier } from "@enum/decorator/api";
import type { IApiEntity } from "@interface/entity";
import type { Type } from "@nestjs/common";
import type { IAuthGuard } from "@nestjs/passport";
import type { TApiPropertyDescribeDateProperties, TApiPropertyDescribeDtoProperties, TApiPropertyDescribeProperties } from "@type/decorator/api/property";
import type { TDtoGenerateIsAllowedCombination } from "@type/utility";

import { EApiDtoType, EApiPropertyDescribeType, EApiRouteType } from "@enum/decorator/api";
import { DtoGenerateDecorator } from "@utility/dto/generate-decorator.utility";
import { DtoGetDecoratorConfig } from "@utility/dto/get-decorator-config.utility";
import { DtoHandleDateProperty } from "@utility/dto/handle-date-property.utility";
import { DtoIsPropertyExposedForGuard } from "@utility/dto/is-property-exposed-for-guard.utility";

/**
 * Creates property decorators for DTOs based on property metadata, entity information, and context.
 * Handles special cases for date properties and guard-based exposure rules.
 * @param {M} method - The API route type (CREATE, DELETE, GET, etc.)
 * @param {TApiPropertyDescribeProperties} propertyMetadata - Metadata describing the property
 * @param {IApiEntity<E>} entity - The entity metadata
 * @param {D} dtoType - The type of DTO (REQUEST, RESPONSE, etc.)
 * @param {string} propertyName - The name of the property
 * @param {Type<IAuthGuard>} [currentGuard] - Optional authentication guard
 * @param {Record<string, Type<unknown>>} [generatedDTOs] - Optional record of dynamically generated DTOs
 * @returns {Array<PropertyDecorator> | undefined} Array of property decorators or undefined if property should not be included
 * @template E - The entity type
 * @template M - The API route type
 * @template D - The DTO type
 */
// eslint-disable-next-line @elsikora/typescript/no-unnecessary-type-parameters
export function DtoBuildDecorator<E, M extends EApiRouteType, D extends EApiDtoType>(method: M, propertyMetadata: TApiPropertyDescribeProperties, entity: IApiEntity<E>, dtoType: D, propertyName: string, currentGuard?: Type<IAuthGuard>, generatedDTOs?: Record<string, Type<unknown>>): Array<PropertyDecorator> | undefined {
	type TAllowed = TDtoGenerateIsAllowedCombination<M, D>;

	type TPropertiesType = TAllowed extends true ? TApiPropertyDescribeDtoProperties : never;

	const properties: Record<D, TPropertiesType> | undefined = propertyMetadata.properties?.[method] as Record<D, TPropertiesType> | undefined;

	if (properties?.[dtoType]?.isEnabled === false || (properties?.[dtoType]?.isResponse && properties?.[dtoType]?.isExpose === false)) {
		return undefined;
	}

	if (!DtoIsPropertyExposedForGuard(method, propertyMetadata, dtoType, currentGuard)) {
		return undefined;
	}

	if (propertyMetadata.type === EApiPropertyDescribeType.DATE) {
		const dateMetadata: TApiPropertyDescribeDateProperties = propertyMetadata;

		if ((method === EApiRouteType.UPDATE || method === EApiRouteType.PARTIAL_UPDATE) && dtoType === EApiDtoType.BODY) {
			return undefined;
		}

		if (method === EApiRouteType.GET_LIST && dtoType === EApiDtoType.QUERY) {
			const dateProperties: Array<{ identifier: EApiPropertyDateIdentifier; name: string }> = DtoHandleDateProperty(propertyName, dateMetadata.identifier);

			return dateProperties.map((property: { identifier: EApiPropertyDateIdentifier; name: string }) => {
				const newMetadata: TApiPropertyDescribeProperties = { ...dateMetadata, identifier: property.identifier };
				const config: TApiPropertyDescribeDtoProperties = DtoGetDecoratorConfig(method, newMetadata, dtoType, property.name);

				return DtoGenerateDecorator(newMetadata, entity, config, method, dtoType, propertyName);
			});
		}
	}

	const config: TApiPropertyDescribeDtoProperties = DtoGetDecoratorConfig(method, propertyMetadata, dtoType, propertyName);

	return [DtoGenerateDecorator(propertyMetadata, entity, config, method, dtoType, propertyName, generatedDTOs)];
}
