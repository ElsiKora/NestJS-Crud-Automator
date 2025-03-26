import type { EApiDtoType, EApiRouteType } from "@enum/decorator/api";
import type { IApiEntity } from "@interface/entity";
import type { Type } from "@nestjs/common";
import type { IAuthGuard } from "@nestjs/passport";
import type { TApiPropertyDescribeDtoProperties, TApiPropertyDescribeProperties } from "@type/decorator/api/property";
import type { TDtoGenerateIsAllowedCombination } from "@type/utility";

import { EApiPropertyDescribeType } from "@enum/decorator/api";
import { CamelCaseString } from "@utility/camel-case-string.utility";
import { DtoBuildDecorator } from "@utility/dto/build-decorator.utility";
import { DtoIsPropertyExposedForGuard } from "@utility/dto/is-property-exposed-for-guard.utility";

/**
 * Generates dynamic DTOs for object-type properties based on property metadata.
 * Creates classes on the fly with appropriate decorators for each property and sets up
 * proper inheritance and naming conventions.
 * @param {M} method - The API route type (CREATE, DELETE, GET, etc.)
 * @param {TApiPropertyDescribeProperties} propertyMetadata - Metadata describing the property
 * @param {IApiEntity<E>} entity - The entity metadata
 * @param {D} dtoType - The type of DTO (REQUEST, RESPONSE, etc.)
 * @param {string} _propertyName - The name of the property
 * @param {Type<IAuthGuard>} [currentGuard] - Optional authentication guard
 * @returns {Record<string, Type<unknown>> | undefined} A record of generated DTO classes or undefined if generation not needed
 * @template E - The entity type
 * @template M - The API route type
 * @template D - The DTO type
 */
// eslint-disable-next-line @elsikora/typescript/no-unnecessary-type-parameters
export function DtoGenerateDynamic<E, M extends EApiRouteType, D extends EApiDtoType>(method: M, propertyMetadata: TApiPropertyDescribeProperties, entity: IApiEntity<E>, dtoType: D, _propertyName: string, currentGuard?: Type<IAuthGuard>): Record<string, Type<unknown>> | undefined {
	if (propertyMetadata.type !== EApiPropertyDescribeType.OBJECT) {
		return undefined;
	}

	type TAllowed = TDtoGenerateIsAllowedCombination<M, D>;

	type TPropertiesType = TAllowed extends true ? TApiPropertyDescribeDtoProperties : never;

	const properties: Record<D, TPropertiesType> | undefined = propertyMetadata.properties?.[method] as Record<D, TPropertiesType> | undefined;

	if (properties?.[dtoType]?.isEnabled === false || (properties?.[dtoType]?.isResponse && properties?.[dtoType]?.isExpose === false)) {
		return undefined;
	}

	if (!DtoIsPropertyExposedForGuard(method, propertyMetadata, dtoType, currentGuard)) {
		return undefined;
	}

	const generatedDTOs: Record<string, Type<unknown>> = {};

	if (propertyMetadata.type === EApiPropertyDescribeType.OBJECT && !Array.isArray(propertyMetadata.dataType) && "isDynamicallyGenerated" in propertyMetadata && propertyMetadata.isDynamicallyGenerated) {
		const dataForGeneration: Array<{ data: Record<string, TApiPropertyDescribeProperties>; name: string }> = [];

		for (const dynamicDtoName of Object.keys(propertyMetadata.dataType)) {
			if (propertyMetadata.dataType[dynamicDtoName]) {
				dataForGeneration.push({
					data: propertyMetadata.dataType[dynamicDtoName],
					name: dynamicDtoName,
				});
			}
		}

		for (const { data, name } of dataForGeneration) {
			class GeneratedDTO {
				constructor() {
					for (const propertyName of Object.keys(data)) {
						Object.defineProperty(this, propertyName, {
							// eslint-disable-next-line @elsikora/typescript/naming-convention
							configurable: true,
							// eslint-disable-next-line @elsikora/typescript/naming-convention
							enumerable: true,
							value: undefined,
							// eslint-disable-next-line @elsikora/typescript/naming-convention
							writable: true,
						});
					}
				}
			}

			for (const propertyName of Object.keys(data)) {
				if (data[propertyName]) {
					const decorators: Array<PropertyDecorator> | undefined = DtoBuildDecorator(method, data[propertyName], entity, dtoType, propertyName, currentGuard, {});

					if (decorators) {
						for (const [, decorator] of decorators.entries()) {
							decorator(GeneratedDTO.prototype, propertyName);
						}
					}
				}
			}

			Object.defineProperty(GeneratedDTO, "name", {
				value: `${entity.name ?? "UnknownResource"}${CamelCaseString(method)}${CamelCaseString(dtoType)}${CamelCaseString(_propertyName)}${CamelCaseString(name)}DTO`,
			});

			generatedDTOs[name] = GeneratedDTO;
		}
	}

	return generatedDTOs;
}
