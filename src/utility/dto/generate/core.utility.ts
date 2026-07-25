import type { IApiControllerPropertiesRouteAutoDtoConfig } from "@interface/decorator/api";
import type { IApiEntity, IApiEntityColumn } from "@interface/entity";
import type { Type } from "@nestjs/common";
import type { IAuthGuard } from "@nestjs/passport";
import type { TApiPropertyDescribeProperties } from "@type/decorator/api/property";
import type { ObjectLiteral } from "typeorm";

import { PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT } from "@constant/decorator/api";
import { DTO_GENERATE_CONSTANT } from "@constant/utility/dto/generate.constant";
import { EApiDtoType, EApiPropertyDescribeType, EApiRouteType } from "@enum/decorator/api";
import { ApiExtraModels } from "@nestjs/swagger";
import { CamelCaseString } from "@utility/camel-case-string.utility";
import { DtoAutoContextPop } from "@utility/dto/auto/context/pop.utility";
import { DtoAutoContextPush } from "@utility/dto/auto/context/push.utility";
import { DtoBuildDecorator } from "@utility/dto/build-decorator.utility";
import { DtoGenerateCacheKey } from "@utility/dto/generate/cache-key.utility";
import { DtoGenerateDynamic } from "@utility/dto/generate/dynamic.utility";
import { DtoGenerateFilterDecorator } from "@utility/dto/generate/filter-decorator.utility";
import { DtoGenerateGetListResponse } from "@utility/dto/generate/get-list-response.utility";
import { DtoGetGetListQueryBaseClass } from "@utility/dto/get/get-list-query-base-class.utility";
import { DtoIsPropertyShouldBeMarked } from "@utility/dto/is/property/should-be-marked.utility";
import { DtoIsShouldBeGenerated } from "@utility/dto/is/should-be-generated.utility";
import { ErrorException } from "@utility/error/exception.utility";
import { GenerateEntityInformation } from "@utility/generate-entity-information.utility";
import { HasPairedCustomSuffixesFieldsValidator } from "@validator/has/paired-custom-suffixes-fields.validator";
import { Validate } from "class-validator";

const dtoGenerateCache: Map<string, Type<unknown>> = new Map<string, Type<unknown>>();

/**
 * Core utility for DTO generation that determines which properties should be included in the DTO.
 * Builds decorators, handles special cases like filter queries, and generates the appropriate class
 * based on entity metadata, route type, and DTO type.
 * @param {ObjectLiteral} entity - The entity class or prototype
 * @param {IApiEntity<E>} entityMetadata - The entity metadata containing column information
 * @param {EApiRouteType} method - The API route type (CREATE, DELETE, GET, etc.)
 * @param {EApiDtoType} dtoType - The type of DTO (REQUEST, RESPONSE, etc.)
 * @param {IApiControllerPropertiesRouteAutoDtoConfig} [dtoConfig] - Optional configuration for automatic DTO generation
 * @param {Type<IAuthGuard>} [currentGuard] - Optional authentication guard for property visibility control
 * @returns {Type<unknown> | undefined} The generated DTO class or undefined if no DTO should be generated
 * @throws {Error} When primary key metadata is missing
 * @template E - The entity type
 */
export function DtoGenerate<E>(entity: ObjectLiteral, entityMetadata: IApiEntity<E>, method: EApiRouteType, dtoType: EApiDtoType, dtoConfig?: IApiControllerPropertiesRouteAutoDtoConfig, currentGuard?: Type<IAuthGuard>): Type<unknown> | undefined {
	if (!DtoIsShouldBeGenerated(method, dtoType)) {
		return undefined;
	}

	const cacheKey: string = DtoGenerateCacheKey({
		dtoConfig,
		dtoType,
		entityName: String(entityMetadata.name),
		guardName: currentGuard?.name,
		method,
	});

	const cached: Type<unknown> | undefined = dtoGenerateCache.get(cacheKey);

	if (cached) {
		return cached;
	}

	if (!entityMetadata.primaryKey?.metadata?.[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY]) {
		throw ErrorException(`Primary key for entity ${String(entityMetadata.name)} not found in metadata storage`);
	}

	// eslint-disable-next-line @elsikora/typescript/no-unsafe-function-type
	const extraModels: Array<Function> = [];

	const markedProperties: Array<{
		isPrimary: boolean;
		metadata: TApiPropertyDescribeProperties;
		name: keyof E;
	}> = [];

	for (const column of entityMetadata.columns) {
		if (column.metadata?.[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY] && DtoIsPropertyShouldBeMarked(method, dtoType, column.name as string, column.metadata[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY] as TApiPropertyDescribeProperties, column.isPrimary, currentGuard)) {
			markedProperties.push({
				isPrimary: column.isPrimary,
				metadata: column.metadata[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY] as TApiPropertyDescribeProperties,
				name: column.name,
			});
		}
	}

	const queryFilterProperties: Array<{
		entityMetadata: IApiEntity<unknown>;
		metadata: TApiPropertyDescribeProperties;
		name: string;
	}> = [];

	if (method === EApiRouteType.GET_LIST && dtoType === EApiDtoType.QUERY) {
		for (const property of markedProperties) {
			if (property.metadata.type !== EApiPropertyDescribeType.RELATION) {
				queryFilterProperties.push({
					entityMetadata: entityMetadata as IApiEntity<unknown>,
					metadata: property.metadata,
					name: property.name as string,
				});

				continue;
			}

			const relationColumn: IApiEntityColumn<E> | undefined = entityMetadata.columns.find((column: IApiEntityColumn<E>): boolean => column.name == property.name);

			if (!relationColumn?.relation?.target) continue;

			let relationEntityMetadata: IApiEntity<unknown>;

			try {
				relationEntityMetadata = GenerateEntityInformation(relationColumn.relation.target);
			} catch {
				continue;
			}

			for (const relationProperty of relationEntityMetadata.columns) {
				const relationPropertyMetadata: TApiPropertyDescribeProperties | undefined = relationProperty.metadata?.[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY] as TApiPropertyDescribeProperties | undefined;

				if (!relationPropertyMetadata || relationPropertyMetadata.type === EApiPropertyDescribeType.RELATION || relationPropertyMetadata.type === EApiPropertyDescribeType.OBJECT) continue;

				if (!relationProperty.isPrimary && !DtoIsPropertyShouldBeMarked(method, dtoType, relationProperty.name, relationPropertyMetadata, relationProperty.isPrimary, currentGuard)) continue;

				queryFilterProperties.push({
					entityMetadata: relationEntityMetadata,
					metadata: relationPropertyMetadata,
					name: `${property.name as string}.${relationProperty.name as string}`,
				});
			}
		}
	}
	const BaseClass: Type = method === EApiRouteType.GET_LIST && dtoType === EApiDtoType.QUERY ? DtoGetGetListQueryBaseClass<E>(entity, entityMetadata, method, dtoType) : class {};

	class GeneratedDTO extends BaseClass {
		constructor() {
			super();

			if (method === EApiRouteType.GET_LIST && dtoType === EApiDtoType.QUERY) {
				for (const property of queryFilterProperties) {
					Object.defineProperty(this, `${property.name}[value]`, {
						// eslint-disable-next-line @elsikora/typescript/naming-convention
						configurable: true,
						// eslint-disable-next-line @elsikora/typescript/naming-convention
						enumerable: true,
						value: undefined,
						// eslint-disable-next-line @elsikora/typescript/naming-convention
						writable: true,
					});

					Object.defineProperty(this, `${property.name}[values]`, {
						// eslint-disable-next-line @elsikora/typescript/naming-convention
						configurable: true,
						// eslint-disable-next-line @elsikora/typescript/naming-convention
						enumerable: true,
						value: undefined,
						// eslint-disable-next-line @elsikora/typescript/naming-convention
						writable: true,
					});

					Object.defineProperty(this, `${property.name}[operator]`, {
						// eslint-disable-next-line @elsikora/typescript/naming-convention
						configurable: true,
						// eslint-disable-next-line @elsikora/typescript/naming-convention
						enumerable: true,
						value: undefined,
						// eslint-disable-next-line @elsikora/typescript/naming-convention
						writable: true,
					});
				}
			} else {
				for (const property of markedProperties) {
					Object.defineProperty(this, property.name, {
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
	}

	Object.defineProperty(GeneratedDTO, "name", {
		value: `${entityMetadata.name ?? "UnknownResource"}${CamelCaseString(method)}${CamelCaseString(dtoType)}DTO`,
	});

	DtoAutoContextPush(GeneratedDTO.prototype, method, dtoType);

	try {
		if (method === EApiRouteType.GET_LIST && dtoType === EApiDtoType.QUERY) {
			for (const property of queryFilterProperties) {
				const decorators: Array<PropertyDecorator> | undefined = DtoBuildDecorator(method, property.metadata, property.entityMetadata, dtoType, property.name, currentGuard);

				if (decorators) {
					for (const [, decorator] of decorators.entries()) {
						decorator(GeneratedDTO.prototype, `${property.name}[value]`);

						DtoGenerateFilterDecorator(property.metadata, property.entityMetadata)(GeneratedDTO.prototype, `${property.name}[operator]`);
					}
				}

				const metadataArray: TApiPropertyDescribeProperties = { ...property.metadata, isArray: true, isUniqueItems: false, maxItems: DTO_GENERATE_CONSTANT.MAXIMUM_FILTER_PROPERTIES, minItems: DTO_GENERATE_CONSTANT.MINIMUM_FILTER_PROPERTIES } as TApiPropertyDescribeProperties;

				const decoratorsArray: Array<PropertyDecorator> | undefined = DtoBuildDecorator(method, metadataArray, property.entityMetadata, dtoType, property.name, currentGuard);

				if (decoratorsArray) {
					for (const [, decorator] of decoratorsArray.entries()) {
						decorator(GeneratedDTO.prototype, `${property.name}[values]`);
					}
				}
			}
		} else {
			for (const property of markedProperties) {
				const generatedDTOs: Record<string, Type<unknown>> | undefined = DtoGenerateDynamic(method, property.metadata, entityMetadata, dtoType, property.name as string, currentGuard);

				const decorators: Array<PropertyDecorator> | undefined = DtoBuildDecorator(method, property.metadata, entityMetadata, dtoType, property.name as string, currentGuard, generatedDTOs);

				if (decorators) {
					for (const [, decorator] of decorators.entries()) {
						decorator(GeneratedDTO.prototype, property.name as string);
					}
				}

				if (property.metadata.type === EApiPropertyDescribeType.OBJECT && Array.isArray(property.metadata.dataType)) {
					// @ts-ignore
					extraModels.push(...property.metadata.dataType);
				}

				if (generatedDTOs) {
					for (const [, value] of Object.entries(generatedDTOs)) {
						extraModels.push(value);
					}
				}
			}
		}
	} finally {
		DtoAutoContextPop(GeneratedDTO.prototype);
	}

	if (dtoConfig?.validators) {
		for (const validator of dtoConfig.validators) {
			Validate(validator.constraintClass, validator.options)(GeneratedDTO.prototype, "object");
		}
	}

	if (method === EApiRouteType.GET_LIST && dtoType === EApiDtoType.QUERY) {
		Object.defineProperty(GeneratedDTO.prototype, "object", {
			// eslint-disable-next-line @elsikora/typescript/naming-convention
			configurable: true,

			// eslint-disable-next-line @elsikora/typescript/naming-convention
			enumerable: true,
			value: function (this: InstanceType<typeof GeneratedDTO>): InstanceType<typeof GeneratedDTO> {
				return this;
			},

			// eslint-disable-next-line @elsikora/typescript/naming-convention
			writable: true,
		});

		Validate(HasPairedCustomSuffixesFieldsValidator, ["operator", ["value", "values"]])(GeneratedDTO.prototype, "object");
	}

	if (extraModels.length > 0) {
		ApiExtraModels(...extraModels)(GeneratedDTO);
	}

	// @ts-ignore
	const result: Type<unknown> = method === EApiRouteType.GET_LIST && dtoType === EApiDtoType.RESPONSE ? DtoGenerateGetListResponse(entity, GeneratedDTO, `${entityMetadata.name ?? "UnknownResource"}${CamelCaseString(method)}${CamelCaseString(dtoType)}ItemsDTO`) : GeneratedDTO;

	dtoGenerateCache.set(cacheKey, result);

	return result;
}
