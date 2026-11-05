import type { EApiPropertyDateIdentifier } from "@enum/decorator/api";
import type { IApiEntity } from "@interface/entity";
import type { CanActivate, Type } from "@nestjs/common";
import type { TApiPropertyDescribeDateProperties, TApiPropertyDescribeDtoProperties, TApiPropertyDescribeProperties } from "@type/decorator/api/property";
import type { TDtoGenerateIsAllowedCombination } from "@type/utility";

import { SIGNED_BIGINT_TEXT_FAILURE_CONSTANT } from "@constant/signed-bigint-text-failure.constant";
import { EApiDtoType, EApiPropertyDescribeType, EApiRouteType } from "@enum/decorator/api";
import { DtoGenerateDecorator } from "@utility/dto/generate/decorator.utility";
import { DtoGetDecoratorConfig } from "@utility/dto/get/decorator-config.utility";
import { DtoHandleDateProperty } from "@utility/dto/handle-date-property.utility";
import { DtoIsPropertyExposedForGuard } from "@utility/dto/is/property/exposed/for-guard.utility";
import { DtoIsPropertyInfrastructureTimestamp } from "@utility/dto/is/property/infrastructure-timestamp.utility";
import { IsBigIntColumnType } from "@utility/is/bigint-column-type.utility";
import { IsSignedBigIntText } from "@utility/is/signed-bigint-text.utility";
import { buildMessage, ValidateBy } from "class-validator";

/**
 * Creates property decorators for DTOs based on property metadata, entity information, and context.
 * Handles special cases for date properties and guard-based exposure rules.
 * @param {M} method - The API route type (CREATE, DELETE, GET, etc.)
 * @param {TApiPropertyDescribeProperties} propertyMetadata - Metadata describing the property
 * @param {IApiEntity<E>} entity - The entity metadata
 * @param {D} dtoType - The type of DTO (REQUEST, RESPONSE, etc.)
 * @param {string} propertyName - The name of the property
 * @param {Type<CanActivate>} [currentGuard] - Optional authentication guard
 * @param {Record<string, Type<unknown>>} [generatedDTOs] - Optional record of dynamically generated DTOs
 * @param {string} [dtoNameBase] - Name of the parent DTO without the `DTO` suffix, used to name nested generated DTOs `<dtoNameBase><Property>DTO`
 * @param {string} [dtoPropertyName] - Name of the DTO property that holds the value when it differs from the entity property, as in a property copied into a hand-written DTO; it names nested generated DTOs in place of `propertyName`
 * @param {string} [hostDtoName] - Class name of the parent DTO for errors and origins, when it is not `<dtoNameBase>DTO`, as with a hand-written DTO
 * @returns {Array<PropertyDecorator> | undefined} Array of property decorators or undefined if property should not be included
 * @template E - The entity type
 * @template M - The API route type
 * @template D - The DTO type
 */
// eslint-disable-next-line @elsikora/typescript/no-unnecessary-type-parameters
export function DtoBuildDecorator<E, M extends EApiRouteType, D extends EApiDtoType>(method: M, propertyMetadata: TApiPropertyDescribeProperties, entity: IApiEntity<E>, dtoType: D, propertyName: string, currentGuard?: Type<CanActivate>, generatedDTOs?: Record<string, Type<unknown>>, dtoNameBase?: string, dtoPropertyName?: string, hostDtoName?: string): Array<PropertyDecorator> | undefined {
	type TAllowed = TDtoGenerateIsAllowedCombination<M, D>;

	type TPropertiesType = TAllowed extends true ? TApiPropertyDescribeDtoProperties : never;

	const properties: Record<D, TPropertiesType> | undefined = propertyMetadata.properties?.[method] as Record<D, TPropertiesType> | undefined;

	if (properties?.[dtoType]?.isEnabled === false || (properties?.[dtoType]?.isResponse && properties?.[dtoType]?.isExpose === false)) {
		return undefined;
	}

	if (!DtoIsPropertyExposedForGuard(method, propertyMetadata, dtoType, currentGuard)) {
		return undefined;
	}

	const isWriteBody: boolean = dtoType === EApiDtoType.BODY && (method === EApiRouteType.CREATE || method === EApiRouteType.UPDATE || method === EApiRouteType.PARTIAL_UPDATE);

	if (isWriteBody && DtoIsPropertyInfrastructureTimestamp(propertyMetadata)) {
		return undefined;
	}

	if (propertyMetadata.type === EApiPropertyDescribeType.DATE) {
		const dateMetadata: TApiPropertyDescribeDateProperties = propertyMetadata;

		if (method === EApiRouteType.GET_LIST && dtoType === EApiDtoType.QUERY) {
			const dateProperties: Array<{ identifier: EApiPropertyDateIdentifier; name: string }> = DtoHandleDateProperty(propertyName, dateMetadata.identifier);

			return dateProperties.map((property: { identifier: EApiPropertyDateIdentifier; name: string }) => {
				const newMetadata: TApiPropertyDescribeProperties = { ...dateMetadata, identifier: property.identifier };
				const config: TApiPropertyDescribeDtoProperties = DtoGetDecoratorConfig(method, newMetadata, dtoType);

				return DtoGenerateDecorator(newMetadata, entity, config, method, dtoType, propertyName, undefined, dtoNameBase, dtoPropertyName, hostDtoName);
			});
		}
	}

	const config: TApiPropertyDescribeDtoProperties = DtoGetDecoratorConfig(method, propertyMetadata, dtoType);
	const decorator: PropertyDecorator = DtoGenerateDecorator(propertyMetadata, entity, config, method, dtoType, propertyName, generatedDTOs, dtoNameBase, dtoPropertyName, hostDtoName);

	return isWriteBody && propertyMetadata.type === EApiPropertyDescribeType.STRING && IsBigIntColumnType(entity.columns.find((column: { name: unknown }): boolean => String(column.name) === propertyName)?.type) ? [decorator, buildBigIntRangeDecorator(propertyMetadata.isArray === true)] : [decorator];
}

/**
 * Builds the validator a written text value of a signed 64-bit integer column gets: canonical decimal text in that range, so a value PostgreSQL would refuse with an error answers 400 on every database. `ApiRouteGetNonCanonicalUuidFailures` refuses the same values before any pipe, so the rule holds without a host `ValidationPipe` too. A missing or null value is left to the presence validators of the property.
 * @param {boolean} isArray - Whether the property holds a list, whose every item is checked.
 * @returns {PropertyDecorator} The validator.
 */
function buildBigIntRangeDecorator(isArray: boolean): PropertyDecorator {
	// eslint-disable-next-line @elsikora/typescript/naming-convention
	const validationOptions: { each: boolean } = { each: isArray };

	return ValidateBy(
		{
			name: SIGNED_BIGINT_TEXT_FAILURE_CONSTANT.NOT_SIGNED_BIGINT_TEXT_CONSTRAINT,
			validator: {
				defaultMessage: buildMessage((eachPrefix: string): string => `${eachPrefix}$property must be a signed 64-bit integer in canonical decimal text`, validationOptions),
				validate: (value: unknown): boolean => value === undefined || value === null || IsSignedBigIntText(value),
			},
		},
		validationOptions,
	);
}
