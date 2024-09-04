import { Validate } from "class-validator";

import { ObjectLiteral } from "typeorm";

import { GET_LIST_QUERY_DTO_FACTORY_CONSTANT, NUMBER_CONSTANT, PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT } from "../../constant";
import { ApiPropertyBoolean, ApiPropertyDate, ApiPropertyNumber, ApiPropertyObject, ApiPropertyString, ApiPropertyUUID } from "../../decorator";
import { EApiDtoType, EApiPropertyDataType, EApiPropertyDateType, EApiPropertyDescribeType, EApiRouteType, EFilterOrderDirection } from "../../enum";

import { TApiPropertyDescribeArrayOptionalProperties, TApiPropertyDescribeArrayRequiredProperties, TApiPropertyDescribeBaseProperties, TApiPropertyDescribeBooleanProperties, TApiPropertyDescribeDateProperties, TApiPropertyDescribeDtoProperties, TApiPropertyDescribeNumberProperties, TApiPropertyDescribeObjectProperties, TApiPropertyDescribeProperties, TApiPropertyDescribeStringProperties, TApiPropertyDescribeUuidProperties } from "../../type";

import { AllOrNoneOfListedProperties } from "../../validator";
import { FilterOrderByFromEntity } from "../api";
import { CapitalizeString } from "../capitalize-string.utility";
import { ErrorException } from "../error-exception.utility";

import type { IApiEntity } from "../../interface";
import type { Type } from "@nestjs/common";

type TDecoratorConfig = {
	expose?: boolean;
	required?: boolean;
	response?: boolean;
};

interface IPropertyDecoratorFactory {
	create(metadata: TApiPropertyDescribeProperties, entity: IApiEntity, config: TDecoratorConfig): PropertyDecorator;
}

function getBaseClass(entity: IApiEntity): Type<any> {
	class BaseQueryDTO {
		@ApiPropertyNumber({
			description: "Items per page",
			entity,
			example: GET_LIST_QUERY_DTO_FACTORY_CONSTANT.MINIMUM_LIST_LENGTH,
			maximum: GET_LIST_QUERY_DTO_FACTORY_CONSTANT.MAXIMUM_LIST_LENGTH,
			minimum: GET_LIST_QUERY_DTO_FACTORY_CONSTANT.MINIMUM_LIST_LENGTH,
			multipleOf: NUMBER_CONSTANT.ONE,
			required: true,
			type: EApiPropertyDataType.INTEGER,
		})
		limit!: number;

		@ApiPropertyObject({
			description: "order by field",
			entity,
			required: false,
		})
		orderBy?: string;

		@ApiPropertyObject({
			description: "order direction",
			entity,
			enum: EFilterOrderDirection,
			required: false,
		})
		orderDirection?: EFilterOrderDirection;

		@Validate(AllOrNoneOfListedProperties, ["orderBy", "orderDirection"])
		object(): this {
			return this;
		}
	}

	return BaseQueryDTO;
}

const validatePropertyConfig = (config: TApiPropertyDescribeDtoProperties, propertyName: string): void => {
	if (config.response && config.required !== undefined) {
		throw ErrorException(`Invalid config for ${propertyName}: 'required' should not be set when 'response' is true`);
	}

	if (config.expose && !config.response) {
		throw ErrorException(`Invalid config for ${propertyName}: 'expose' can only be true when 'response' is true`);
	}
};

class UUIDPropertyDecoratorFactory implements IPropertyDecoratorFactory {
	create(metadata: TApiPropertyDescribeUuidProperties, entity: IApiEntity, config: TDecoratorConfig): PropertyDecorator {
		return ApiPropertyUUID({ description: metadata.description, entity, ...config });
	}
}

class StringPropertyDecoratorFactory implements IPropertyDecoratorFactory {
	create(metadata: TApiPropertyDescribeStringProperties, entity: IApiEntity, config: TDecoratorConfig): PropertyDecorator {
		return ApiPropertyString({
			description: metadata.description,
			entity,
			...config,
			example: metadata.example,
			format: metadata.format,
			maxLength: metadata.maxLength,
			minLength: metadata.minLength,
			pattern: metadata.pattern,
			type: metadata.dataType,
		});
	}
}

class DatePropertyDecoratorFactory implements IPropertyDecoratorFactory {
	create(metadata: TApiPropertyDescribeDateProperties, entity: IApiEntity, config: TDecoratorConfig): PropertyDecorator {
		return ApiPropertyDate({
			entity,
			...config,
			type: metadata.dataType,
		});
	}
}

class ObjectPropertyDecoratorFactory implements IPropertyDecoratorFactory {
	create(metadata: TApiPropertyDescribeObjectProperties, entity: IApiEntity, config: TDecoratorConfig): PropertyDecorator {
		return ApiPropertyObject({
			entity,
			...config,
			enum: metadata.enum,
			...metadata,
		});
	}
}

class BooleanPropertyDecoratorFactory implements IPropertyDecoratorFactory {
	create(metadata: TApiPropertyDescribeBooleanProperties, entity: IApiEntity, config: TDecoratorConfig): PropertyDecorator {
		return ApiPropertyBoolean({
			description: metadata.description,
			entity,
			...config,
		});
	}
}

class NumberPropertyDecoratorFactory implements IPropertyDecoratorFactory {
	create(metadata: TApiPropertyDescribeNumberProperties, entity: IApiEntity, config: TDecoratorConfig): PropertyDecorator {
		return ApiPropertyNumber({
			description: metadata.description,
			entity,
			...config,
			maximum: metadata.maximum,
			minimum: metadata.minimum,
			multipleOf: metadata.multipleOf,
			type: metadata.dataType,
		});
	}
}

const propertyDecoratorFactories: Record<EApiPropertyDescribeType, IPropertyDecoratorFactory> = {
	[EApiPropertyDescribeType.BOOLEAN]: new BooleanPropertyDecoratorFactory(),
	[EApiPropertyDescribeType.DATE]: new DatePropertyDecoratorFactory(),
	[EApiPropertyDescribeType.NUMBER]: new NumberPropertyDecoratorFactory(),
	[EApiPropertyDescribeType.OBJECT]: new ObjectPropertyDecoratorFactory(),
	[EApiPropertyDescribeType.STRING]: new StringPropertyDecoratorFactory(),
	[EApiPropertyDescribeType.UUID]: new UUIDPropertyDecoratorFactory(),
};

const generateDecorator = (metadata: TApiPropertyDescribeProperties, entity: IApiEntity, config: TDecoratorConfig): PropertyDecorator => {
	const factory = propertyDecoratorFactories[metadata.type];

	if (!factory) {
		throw ErrorException(`Unknown property type ${metadata.type}`);
	}

	return factory.create(metadata, entity, config);
};

interface IDtoStrategy {
	getDecoratorConfig(method: EApiRouteType, metadata: TApiPropertyDescribeProperties): TDecoratorConfig;
}

class RequestDtoStrategy implements IDtoStrategy {
	getDecoratorConfig(method: EApiRouteType, _metadata: TApiPropertyDescribeProperties): TDecoratorConfig {
		switch (method) {
			case EApiRouteType.GET:

			case EApiRouteType.DELETE: {
				return { expose: false, required: true, response: false };
			}

			case EApiRouteType.CREATE:

			case EApiRouteType.UPDATE: {
				return { expose: false, required: true, response: false };
			}

			case EApiRouteType.PARTIAL_UPDATE: {
				return { expose: false, required: true, response: false };
			}

			default: {
				return { expose: false, required: true, response: false };
			}
		}
	}
}

class ResponseDtoStrategy implements IDtoStrategy {
	getDecoratorConfig(method: EApiRouteType, _metadata: TApiPropertyDescribeProperties): TDecoratorConfig {
		switch (method) {
			case EApiRouteType.DELETE: {
				return { expose: true, required: false, response: true };
			}

			default: {
				return { expose: true, required: false, response: true };
			}
		}
	}
}

class QueryDtoStrategy implements IDtoStrategy {
	getDecoratorConfig(method: EApiRouteType, _metadata: TApiPropertyDescribeProperties): TDecoratorConfig {
		switch (method) {
			case EApiRouteType.GET_LIST: {
				return { expose: false, required: false, response: false };
			}

			default: {
				return { expose: true, required: false, response: false };
			}
		}
	}
}

class BodyDtoStrategy implements IDtoStrategy {
	getDecoratorConfig(method: EApiRouteType, _metadata: TApiPropertyDescribeProperties): TDecoratorConfig {
		switch (method) {
			case EApiRouteType.UPDATE: {
				return { expose: false, required: true, response: false };
			}

			case EApiRouteType.PARTIAL_UPDATE: {
				return { expose: false, required: false, response: false };
			}

			default: {
				return { expose: false, required: false, response: false };
			}
		}
	}
}

const dtoStrategies: Record<EApiDtoType, IDtoStrategy> = {
	[EApiDtoType.BODY]: new BodyDtoStrategy(),
	[EApiDtoType.QUERY]: new QueryDtoStrategy(),
	[EApiDtoType.REQUEST]: new RequestDtoStrategy(),
	[EApiDtoType.RESPONSE]: new ResponseDtoStrategy(),
};

const getDecoratorConfig = <M extends EApiRouteType, D extends EApiDtoType>(method: M, metadata: TApiPropertyDescribeProperties, dtoType: D, propertyName: string): TDecoratorConfig => {
	const strategy: Record<EApiDtoType, IDtoStrategy>[D] = dtoStrategies[dtoType];

	if (!strategy) {
		throw new Error(`Unknown DTO type ${dtoType}`);
	}

	let config: TDecoratorConfig = strategy.getDecoratorConfig(method, metadata);

	type TAllowed = TIsAllowedCombination<M, D>;
	type TPropertiesType = TAllowed extends true ? TApiPropertyDescribeDtoProperties : never;

	const properties: Record<D, TPropertiesType> | undefined = metadata.properties?.[method] as Record<D, TPropertiesType> | undefined;

	if (properties && properties[dtoType]) {
		const customConfig: Record<D, TPropertiesType>[D] = properties[dtoType];
		validatePropertyConfig(customConfig, propertyName);

		config = { ...config, ...customConfig };
	}

	return config;
};

const handleDateProperty = (propertyName: string, dateType: EApiPropertyDateType): Array<{ name: string; type: EApiPropertyDateType }> => {
	const baseTypes: Partial<Record<EApiPropertyDateType, { from: EApiPropertyDateType; to: EApiPropertyDateType }>> = {
		[EApiPropertyDateType.CREATED]: { from: EApiPropertyDateType.CREATED_AT_FROM, to: EApiPropertyDateType.CREATED_AT_TO },
		[EApiPropertyDateType.UPDATED]: { from: EApiPropertyDateType.UPDATED_AT_FROM, to: EApiPropertyDateType.UPDATED_AT_TO },
	};

	return baseTypes[dateType]
		? [
				{ name: `${propertyName}From`, type: baseTypes[dateType].from },
				{ name: `${propertyName}To`, type: baseTypes[dateType].to },
			]
		: [{ name: propertyName, type: dateType }];
};

type TAllowedCombinations = {
	[EApiRouteType.CREATE]: EApiDtoType.BODY | EApiDtoType.RESPONSE;
	[EApiRouteType.DELETE]: EApiDtoType.REQUEST;
	[EApiRouteType.GET_LIST]: EApiDtoType.QUERY | EApiDtoType.RESPONSE;
	[EApiRouteType.GET]: EApiDtoType.REQUEST | EApiDtoType.RESPONSE;
	[EApiRouteType.PARTIAL_UPDATE]: EApiDtoType.BODY | EApiDtoType.REQUEST | EApiDtoType.RESPONSE;
	[EApiRouteType.UPDATE]: EApiDtoType.BODY | EApiDtoType.REQUEST | EApiDtoType.RESPONSE;
};

// Условный тип для проверки, разрешена ли комбинация method и dtoType
type TIsAllowedCombination<M extends EApiRouteType, D extends EApiDtoType> = D extends TAllowedCombinations[M] ? true : false;

// Обновленная функция buildDecorator с проверкой типов
const buildDecorator = <M extends EApiRouteType, D extends EApiDtoType>(method: M, metadata: TApiPropertyDescribeProperties, entity: IApiEntity, dtoType: D, propertyName: string): Array<PropertyDecorator> | undefined => {
	type TAllowed = TIsAllowedCombination<M, D>;

	type TPropertiesType = TAllowed extends true ? TApiPropertyDescribeDtoProperties : never;

	const properties: Record<D, TPropertiesType> | undefined = metadata.properties?.[method] as Record<D, TPropertiesType> | undefined;

	if (properties?.[dtoType]?.enabled === false) {
		return undefined;
	}

	if (metadata.type === EApiPropertyDescribeType.DATE) {
		const dateMetadata:
			| (TApiPropertyDescribeBaseProperties & {
					dataType: EApiPropertyDateType;
					type: EApiPropertyDescribeType.DATE;
			  } & TApiPropertyDescribeArrayOptionalProperties)
			| (TApiPropertyDescribeBaseProperties & {
					dataType: EApiPropertyDateType;
					type: EApiPropertyDescribeType.DATE;
			  } & TApiPropertyDescribeArrayRequiredProperties) = metadata;

		if ((method === EApiRouteType.UPDATE || method === EApiRouteType.PARTIAL_UPDATE) && dtoType === EApiDtoType.BODY) {
			return undefined;
		}

		if (method === EApiRouteType.GET_LIST && dtoType === EApiDtoType.QUERY) {
			const dateProperties: Array<{ name: string; type: EApiPropertyDateType }> = handleDateProperty(propertyName, dateMetadata.dataType);

			return dateProperties.map((property: { name: string; type: EApiPropertyDateType }) => {
				const newMetadata: TApiPropertyDescribeProperties = { ...dateMetadata, dataType: property.type };
				const config: TDecoratorConfig = getDecoratorConfig(method, newMetadata, dtoType, property.name);

				return generateDecorator(newMetadata, entity, config);
			});
		}
	}

	const config: TDecoratorConfig = getDecoratorConfig(method, metadata, dtoType, propertyName);

	return [generateDecorator(metadata, entity, config)];
};

const shouldGenerateDTO = (method: EApiRouteType, dtoType: EApiDtoType): boolean => {
	switch (dtoType) {
		case EApiDtoType.RESPONSE: {
			return method !== EApiRouteType.DELETE;
		}

		case EApiDtoType.QUERY: {
			return method === EApiRouteType.GET_LIST;
		}

		case EApiDtoType.BODY: {
			return [EApiRouteType.CREATE, EApiRouteType.PARTIAL_UPDATE, EApiRouteType.UPDATE].includes(method);
		}

		case EApiDtoType.REQUEST: {
			return [EApiRouteType.DELETE, EApiRouteType.GET, EApiRouteType.PARTIAL_UPDATE, EApiRouteType.UPDATE].includes(method);
		}

		default: {
			return false;
		}
	}
};

export const generateDTOClass = (entity: ObjectLiteral, entityMetadata: IApiEntity, method: EApiRouteType, dtoType: EApiDtoType): Type<unknown> | undefined => {
	if (!shouldGenerateDTO(method, dtoType)) {
		return undefined;
	}

	if (!entityMetadata.primaryKey?.metadata?.[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_PROPERTY_NAME]) {
		throw ErrorException(`Primary key for entity ${entityMetadata.name} not found in metadata storage`);
	}

	const markedProperties: Array<{ isPrimary: boolean; metadata: TApiPropertyDescribeProperties; name: string }> = [];

	for (const column of entityMetadata.columns) {
		if (column.metadata?.[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_PROPERTY_NAME]) {
			markedProperties.push({ isPrimary: column.isPrimary, metadata: column.metadata[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_PROPERTY_NAME] as TApiPropertyDescribeProperties, name: column.name });
		}
	}

	const BaseClass: Type<any> = method === EApiRouteType.GET_LIST && dtoType === EApiDtoType.QUERY ? getBaseClass(entityMetadata) : class {};

	class GeneratedDTO extends BaseClass {
		constructor() {
			super();

			for (const property of markedProperties) {
				if (property.metadata.type === EApiPropertyDescribeType.DATE && method === EApiRouteType.GET_LIST && dtoType === EApiDtoType.QUERY) {
					const dateProperties: Array<{ name: string; type: EApiPropertyDateType }> = handleDateProperty(property.name, property.metadata.dataType);

					for (const property of dateProperties) {
						Object.defineProperty(this, property.name, {
							configurable: true,
							enumerable: true,
							value: undefined,
							writable: true,
						});
					}
				} else {
					Object.defineProperty(this, property.name, {
						configurable: true,
						enumerable: true,
						value: undefined,
						writable: true,
					});
				}
			}

			Object.defineProperty(this, "page", {
				configurable: true,
				enumerable: true,
				value: undefined,
				writable: true,
			});
		}
	}

	// Добавляем orderBy для GET_LIST Query DTO
	if (method === EApiRouteType.GET_LIST && dtoType === EApiDtoType.QUERY) {
		ApiPropertyObject({
			description: "order by field",
			entity: entityMetadata,
			enum: FilterOrderByFromEntity(entity, entityMetadata, method, dtoType),
			required: false,
		})(GeneratedDTO.prototype, "orderBy");

		ApiPropertyNumber({
			description: "Page to return s",
			entity: entityMetadata,
			example: GET_LIST_QUERY_DTO_FACTORY_CONSTANT.MINIMUM_LIST_PAGES_COUNT,
			maximum: GET_LIST_QUERY_DTO_FACTORY_CONSTANT.MAXIMUM_LIST_PAGES_COUNT,
			minimum: GET_LIST_QUERY_DTO_FACTORY_CONSTANT.MINIMUM_LIST_PAGES_COUNT,
			multipleOf: NUMBER_CONSTANT.ONE,
			required: true,
			type: EApiPropertyDataType.INTEGER,
		})(GeneratedDTO.prototype, "page");
	}

	for (const property of markedProperties) {
		if ((dtoType === EApiDtoType.REQUEST && property.isPrimary) || (dtoType === EApiDtoType.QUERY && !property.isPrimary) || (dtoType !== EApiDtoType.REQUEST && dtoType !== EApiDtoType.QUERY)) {
			const decorators: Array<PropertyDecorator> | undefined = buildDecorator(method, property.metadata, entityMetadata, dtoType, property.name);

			if (decorators) {
				for (const [index, decorator] of decorators.entries()) {
					if (property.metadata.type === EApiPropertyDescribeType.DATE && method === EApiRouteType.GET_LIST && dtoType === EApiDtoType.QUERY) {
						const dateProperties: Array<{ name: string; type: EApiPropertyDateType }> = handleDateProperty(property.name, property.metadata.dataType);
						decorator(GeneratedDTO.prototype, dateProperties[index].name);
					} else {
						decorator(GeneratedDTO.prototype, property.name);
					}
				}
			}
		}
	}

	Object.defineProperty(GeneratedDTO, "name", {
		value: `${entityMetadata.name}${CapitalizeString(method)}${CapitalizeString(dtoType)}DTO`,
	});

	return GeneratedDTO;
};
