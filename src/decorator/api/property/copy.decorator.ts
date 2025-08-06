import type { EApiDtoType, EApiRouteType } from "@enum/decorator/api";
import type { IApiEntity, IApiEntityColumn } from "@interface/entity";
import type { Type } from "@nestjs/common";
import type { IAuthGuard } from "@nestjs/passport";
import type { TApiPropertyDescribeProperties } from "@type/decorator/api/property";

import { PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT } from "@constant/decorator/api";
import { applyDecorators } from "@nestjs/common";
import { DtoBuildDecorator } from "@utility/dto/build-decorator.utility";
import { DtoGenerateDynamic } from "@utility/dto/generate-dynamic.utility";
import { ErrorException } from "@utility/error-exception.utility";
import { GenerateEntityInformation } from "@utility/generate-entity-information.utility";

/**
 * Decorator that copies decorators from an automatically generated DTO property.
 * @param {Type<E>} entity - The entity to copy decorators from
 * @param {string} propertyName - The name of the property to copy decorators from
 * @param {EApiRouteType} method - The API route method type (GET, CREATE, UPDATE, etc.)
 * @param {EApiDtoType} dtoType - The DTO type (BODY, QUERY, RESPONSE, etc.)
 * @param {Partial<TApiPropertyDescribeProperties>} metadata - Optional metadata to apply to the copied decorators
 *  @param {Type<IAuthGuard>}  currentGuard - Optional auth guard to use for security filtering
 * @returns {PropertyDecorator} PropertyDecorator - A decorator that applies all decorators from the generated DTO
 * @template E - The entity type
 */
export function ApiPropertyCopy<E>(entity: Type<E>, propertyName: keyof E, method: EApiRouteType, dtoType: EApiDtoType, metadata?: Partial<TApiPropertyDescribeProperties>, currentGuard?: Type<IAuthGuard>): PropertyDecorator {
	return function (target: object, key: string | symbol): void {
		const entityMetadata: IApiEntity<E> = GenerateEntityInformation(entity);

		if (!entityMetadata?.columns) {
			throw ErrorException(`Entity metadata for ${entity.name} not found or invalid`);
		}

		const column: IApiEntityColumn<E> | undefined = entityMetadata.columns.find((column: IApiEntityColumn<E>) => column.name == propertyName);

		if (!column) {
			throw ErrorException(`Property ${String(propertyName)} not found in entity ${entity.name}`);
		}

		let propertyMetadata: TApiPropertyDescribeProperties = column.metadata?.[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY] as TApiPropertyDescribeProperties;

		if (!propertyMetadata) {
			throw ErrorException(`Metadata for property ${String(propertyName)} in entity ${entity.name} not found`);
		}

		if (metadata) {
			propertyMetadata = { ...propertyMetadata, ...(metadata as TApiPropertyDescribeProperties) } as TApiPropertyDescribeProperties;
		}

		const generatedDTOs: Record<string, Type<unknown>> | undefined = DtoGenerateDynamic(method, propertyMetadata, entityMetadata, dtoType, propertyName as string, currentGuard);

		const decorators: Array<PropertyDecorator> | undefined = DtoBuildDecorator(method, propertyMetadata, entityMetadata, dtoType, propertyName as string, currentGuard, generatedDTOs);

		if (!decorators || decorators.length === 0) {
			throw ErrorException(`No decorators generated for property ${String(propertyName)} in entity ${entity.name}`);
		}

		applyDecorators(...decorators)(target, key);
	};
}
