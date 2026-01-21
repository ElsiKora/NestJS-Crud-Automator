import type { EApiDtoType, EApiRouteType } from "@enum/decorator/api";
import type { IDtoGenerateFactory } from "@interface/dto-generate-factory.interface";
import type { IApiEntity } from "@interface/entity";
import type { Type } from "@nestjs/common";
import type { TApiPropertyDescribeDtoProperties, TApiPropertyDescribeProperties } from "@type/decorator/api/property";

import { DTO_UTILITY_CONSTANT } from "@constant/utility/dto/constant";
import { ErrorException } from "@utility/error/exception.utility";

/**
 * Factory function that generates appropriate property decorators based on property type.
 * Uses factories defined in DTO_UTILITY_CONSTANT to create the correct decorator for each property type.
 * @param {TApiPropertyDescribeProperties} metadata - Metadata describing the property
 * @param {IApiEntity<E>} entity - The entity metadata
 * @param {TApiPropertyDescribeDtoProperties} config - Configuration for the decorator
 * @param {EApiRouteType} method - The API route type (CREATE, DELETE, GET, etc.)
 * @param {EApiDtoType} dtoType - The type of DTO (REQUEST, RESPONSE, etc.)
 * @param {string} propertyName - The name of the property
 * @param {Record<string, Type<unknown>>} [generatedDTOs] - Optional record of dynamically generated DTOs
 * @returns {PropertyDecorator} The generated property decorator
 * @throws {Error} When property type has no registered factory
 * @template E - The entity type
 */
export function DtoGenerateDecorator<E>(metadata: TApiPropertyDescribeProperties, entity: IApiEntity<E>, config: TApiPropertyDescribeDtoProperties, method: EApiRouteType, dtoType: EApiDtoType, propertyName: string, generatedDTOs?: Record<string, Type<unknown>>): PropertyDecorator {
	const factory: IDtoGenerateFactory<E> = DTO_UTILITY_CONSTANT.PROPERTY_DECORATOR_FACTORIES[metadata.type] as IDtoGenerateFactory<E>;

	if (!factory) {
		throw ErrorException(`Unknown property type ${metadata.type}`);
	}

	return factory.create(metadata, entity, config, method, dtoType, propertyName, generatedDTOs);
}
