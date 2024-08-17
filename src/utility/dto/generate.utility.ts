import {API_PROPERTY_DESCRIBE_DECORATOR_CONSTANT, NUMBER_CONSTANT} from "../../constant";
import { ApiPropertyBoolean, ApiPropertyDate, ApiPropertyNumber, ApiPropertyObject, ApiPropertyString, ApiPropertyUUID } from "../../decorator";
import {
	EApiDtoType,
	EApiPropertyDataType,
	EApiPropertyDateType,
	EApiPropertyDescribeType,
	EApiRouteType, EFilterOrderDirection
} from "../../enum";

import type { IApiEntity } from "../../interface";
import { TApiPropertyDescribeProperties, TBasePropertyPropertiesDtoProperties, TBooleanPropertyType, TDatePropertyType, TNumberPropertyType, TObjectPropertyType, TStringPropertyType, TUuidPropertyType } from "../../type";
import type { Type } from "@nestjs/common";
import {ErrorException} from "../error-exception.utility";
import {CapitalizeString} from "../capitalize-string.utility";
import GET_LIST_QUERY_DTO_FACTOR_CONSTANT from "../../constant/factory/dto/get-list-query.constant";
import {Validate} from "class-validator";
import {FilterOrderByFromEntity} from "../api";
import {AllOrNoneOfListedProperties} from "../../validator";
import {ObjectLiteral} from "typeorm";

type DecoratorConfig = {
	required?: boolean;
	expose?: boolean;
	response?: boolean;
};

interface PropertyDecoratorFactory {
	create(metadata: TApiPropertyDescribeProperties, entity: IApiEntity, config: DecoratorConfig): PropertyDecorator;
}

function getBaseClass(entity: IApiEntity): Type<any> {
	 class BaseQueryDTO {
		@ApiPropertyNumber({
			description: "Items per page",
			example: GET_LIST_QUERY_DTO_FACTOR_CONSTANT.MINIMUM_LIST_LENGTH,
			maximum: GET_LIST_QUERY_DTO_FACTOR_CONSTANT.MAXIMUM_LIST_LENGTH,
			minimum: GET_LIST_QUERY_DTO_FACTOR_CONSTANT.MINIMUM_LIST_LENGTH,
			multipleOf: NUMBER_CONSTANT.ONE,
			required: true,
			type: EApiPropertyDataType.INTEGER,
			entity
		})
		limit!: number;

		@ApiPropertyObject({
			description: "order by field",
			required: false,
			entity
		})
		orderBy?: string;

		@ApiPropertyObject({
			description: "order direction",
			entity,
			enum: EFilterOrderDirection,
			required: false
		})
		orderDirection?: EFilterOrderDirection;

		@Validate(AllOrNoneOfListedProperties, ["orderBy", "orderDirection"])
		object(): this {
			return this;
		}
	}

	return BaseQueryDTO;
}




const validatePropertyConfig = (config: TBasePropertyPropertiesDtoProperties, propertyName: string): void => {
	if (config.response && config.required !== undefined) {
		throw ErrorException(`Invalid config for ${propertyName}: 'required' should not be set when 'response' is true`);
	}
	if (config.expose && !config.response) {
		throw ErrorException(`Invalid config for ${propertyName}: 'expose' can only be true when 'response' is true`);
	}
};

class UUIDPropertyDecoratorFactory implements PropertyDecoratorFactory {
	create(metadata: TUuidPropertyType, entity: IApiEntity, config: DecoratorConfig): PropertyDecorator {
		return ApiPropertyUUID({ description: metadata.description, entity, ...config });
	}
}

class StringPropertyDecoratorFactory implements PropertyDecoratorFactory {
	create(metadata: TStringPropertyType, entity: IApiEntity, config: DecoratorConfig): PropertyDecorator {
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

class DatePropertyDecoratorFactory implements PropertyDecoratorFactory {
	create(metadata: TDatePropertyType, entity: IApiEntity, config: DecoratorConfig): PropertyDecorator {
		return ApiPropertyDate({
			entity,
			...config,
			type: metadata.dataType,
		});
	}
}

class ObjectPropertyDecoratorFactory implements PropertyDecoratorFactory {
	create(metadata: TObjectPropertyType, entity: IApiEntity, config: DecoratorConfig): PropertyDecorator {
		return ApiPropertyObject({
			description: metadata.description,
			entity,
			...config,
			enum: metadata.enum,
			isArray: metadata.isArray,
			uniqueItems: metadata.uniqueItems,
		});
	}
}

class BooleanPropertyDecoratorFactory implements PropertyDecoratorFactory {
	create(metadata: TBooleanPropertyType, entity: IApiEntity, config: DecoratorConfig): PropertyDecorator {
		return ApiPropertyBoolean({
			description: metadata.description,
			entity,
			...config,
		});
	}
}

class NumberPropertyDecoratorFactory implements PropertyDecoratorFactory {
	create(metadata: TNumberPropertyType, entity: IApiEntity, config: DecoratorConfig): PropertyDecorator {
		return ApiPropertyNumber({
			description: metadata.description,
			entity,
			...config,
			type: metadata.dataType,
			minimum: metadata.minimum,
			maximum: metadata.maximum,
			multipleOf: metadata.multipleOf,
		});
	}
}

const propertyDecoratorFactories: Record<EApiPropertyDescribeType, PropertyDecoratorFactory> = {
	[EApiPropertyDescribeType.UUID]: new UUIDPropertyDecoratorFactory(),
	[EApiPropertyDescribeType.STRING]: new StringPropertyDecoratorFactory(),
	[EApiPropertyDescribeType.DATE]: new DatePropertyDecoratorFactory(),
	[EApiPropertyDescribeType.OBJECT]: new ObjectPropertyDecoratorFactory(),
	[EApiPropertyDescribeType.BOOLEAN]: new BooleanPropertyDecoratorFactory(),
	[EApiPropertyDescribeType.NUMBER]: new NumberPropertyDecoratorFactory(),
};

const generateDecorator = (metadata: TApiPropertyDescribeProperties, entity: IApiEntity, config: DecoratorConfig): PropertyDecorator => {
	const factory = propertyDecoratorFactories[metadata.type];
	if (!factory) {
		throw ErrorException(`Unknown property type ${metadata.type}`);
	}
	return factory.create(metadata, entity, config);
};

interface DtoStrategy {
	getDecoratorConfig(method: EApiRouteType, metadata: TApiPropertyDescribeProperties): DecoratorConfig;
}

class RequestDtoStrategy implements DtoStrategy {
	getDecoratorConfig(method: EApiRouteType, _metadata: TApiPropertyDescribeProperties): DecoratorConfig {
		switch (method) {
			case EApiRouteType.GET:
			case EApiRouteType.DELETE:
				return { expose: false, required: true, response: false };
			case EApiRouteType.CREATE:
			case EApiRouteType.UPDATE:
				return { expose: false, required: true, response: false };
			case EApiRouteType.PARTIAL_UPDATE:
				return { expose: false, required: true, response: false };

			default:
				return { expose: false, required: true, response: false };
		}
	}
}

class ResponseDtoStrategy implements DtoStrategy {
	getDecoratorConfig(method: EApiRouteType, _metadata: TApiPropertyDescribeProperties): DecoratorConfig {
		switch (method) {
			case EApiRouteType.DELETE:
				return { response: true, expose: true, required: false };
			default:
				return { response: true, expose: true, required: false };
		}
	}
}

class QueryDtoStrategy implements DtoStrategy {
	getDecoratorConfig(method: EApiRouteType, _metadata: TApiPropertyDescribeProperties): DecoratorConfig {
		switch (method) {
			case EApiRouteType.GET_LIST:
				return { response: false, expose: false, required: false };

			default:
				return { response: false, expose: true, required: false };
		}
	}
}

class BodyDtoStrategy implements DtoStrategy {
	getDecoratorConfig(method: EApiRouteType, _metadata: TApiPropertyDescribeProperties): DecoratorConfig {
		switch (method) {
			case EApiRouteType.UPDATE:
				return { response: false, expose: false, required: true };
			case EApiRouteType.PARTIAL_UPDATE:
				return { response: false, expose: false, required: false };
			default:
				return { response: false, expose: false, required: false };
		}
	}
}

const dtoStrategies: Record<EApiDtoType, DtoStrategy> = {
	[EApiDtoType.REQUEST]: new RequestDtoStrategy(),
	[EApiDtoType.RESPONSE]: new ResponseDtoStrategy(),
	[EApiDtoType.QUERY]: new QueryDtoStrategy(),
	[EApiDtoType.BODY]: new BodyDtoStrategy(),
};

const getDecoratorConfig = (method: EApiRouteType, metadata: TApiPropertyDescribeProperties, dtoType: EApiDtoType, propertyName: string): DecoratorConfig => {
	const strategy = dtoStrategies[dtoType];
	if (!strategy) {
		throw ErrorException(`Unknown DTO type ${dtoType}`);
	}

	let config = strategy.getDecoratorConfig(method, metadata);

	if (metadata.properties?.[method]?.[dtoType]) {
		const customConfig = metadata.properties[method][dtoType];
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
			{ name: `${propertyName}From`, type: baseTypes[dateType]!.from },
			{ name: `${propertyName}To`, type: baseTypes[dateType]!.to }
		]
		: [{ name: propertyName, type: dateType }];
};

const buildDecorator = (method: EApiRouteType, metadata: TApiPropertyDescribeProperties, entity: IApiEntity, dtoType: EApiDtoType, propertyName: string): PropertyDecorator[] | null => {
	if (metadata.properties?.[method]?.[dtoType]?.enabled === false) {
		return null;
	}

	if (metadata.type === EApiPropertyDescribeType.DATE) {
		const dateMetadata = metadata as TDatePropertyType;

		if ((method === EApiRouteType.UPDATE || method === EApiRouteType.PARTIAL_UPDATE) && (dtoType === EApiDtoType.BODY)) {
			return null;
		}

		if (method === EApiRouteType.GET_LIST && dtoType === EApiDtoType.QUERY) {
			const dateProps = handleDateProperty(propertyName, dateMetadata.dataType);
			return dateProps.map(prop => {
				const newMetadata = { ...dateMetadata, dataType: prop.type };
				const config = getDecoratorConfig(method, newMetadata, dtoType, prop.name);
				return generateDecorator(newMetadata, entity, config);
			});
		}
	}

	const config = getDecoratorConfig(method, metadata, dtoType, propertyName);
	return [generateDecorator(metadata, entity, config)];
};

const shouldGenerateDTO = (method: EApiRouteType, dtoType: EApiDtoType): boolean => {
	switch (dtoType) {
		case EApiDtoType.RESPONSE:
			return method !== EApiRouteType.DELETE;
		case EApiDtoType.QUERY:
			return method === EApiRouteType.GET_LIST;
		case EApiDtoType.BODY:
			return [EApiRouteType.CREATE, EApiRouteType.UPDATE, EApiRouteType.PARTIAL_UPDATE].includes(method);
		case EApiDtoType.REQUEST:
			return [EApiRouteType.DELETE, EApiRouteType.GET, EApiRouteType.PARTIAL_UPDATE, EApiRouteType.UPDATE].includes(method);
		default:
			return false;
	}
};

export const generateDTOClass = (entity: ObjectLiteral, entityMetadata: IApiEntity, method: EApiRouteType, dtoType: EApiDtoType): Type<unknown> | undefined => {
	if (!shouldGenerateDTO(method, dtoType)) {
		return undefined;
	}

	if (!entityMetadata.primaryKey?.metadata?.[API_PROPERTY_DESCRIBE_DECORATOR_CONSTANT.METADATA_PROPERTY_NAME]) {
		throw ErrorException(`Primary key for entity ${entityMetadata.name} not found in metadata storage`);
	}

	const markedProperties: Array<{ metadata: TApiPropertyDescribeProperties; name: string; isPrimary: boolean }> = [];

	for (const column of entityMetadata.columns) {
		if (column.metadata?.[API_PROPERTY_DESCRIBE_DECORATOR_CONSTANT.METADATA_PROPERTY_NAME]) {
			markedProperties.push({ metadata: column.metadata[API_PROPERTY_DESCRIBE_DECORATOR_CONSTANT.METADATA_PROPERTY_NAME] as TApiPropertyDescribeProperties, name: column.name, isPrimary: column.isPrimary });
		}
	}

	const BaseClass = method === EApiRouteType.GET_LIST && dtoType === EApiDtoType.QUERY
		? getBaseClass(entityMetadata)
		: class {};

	class GeneratedDTO extends BaseClass {
		constructor() {
			super();
			for (const property of markedProperties) {
				if (property.metadata.type === EApiPropertyDescribeType.DATE &&
					method === EApiRouteType.GET_LIST &&
					dtoType === EApiDtoType.QUERY) {
					const dateProps = handleDateProperty(property.name, (property.metadata as TDatePropertyType).dataType);
					dateProps.forEach(prop => {
						Object.defineProperty(this, prop.name, {
							configurable: true,
							enumerable: true,
							value: undefined,
							writable: true,
						});
					});
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
			enum: FilterOrderByFromEntity(entity),
			required: false,
		})(GeneratedDTO.prototype, 'orderBy');

	ApiPropertyNumber({
		description: "Page to return s",
		example: GET_LIST_QUERY_DTO_FACTOR_CONSTANT.MINIMUM_LIST_PAGES_COUNT,
		maximum: GET_LIST_QUERY_DTO_FACTOR_CONSTANT.MAXIMUM_LIST_PAGES_COUNT,
		minimum: GET_LIST_QUERY_DTO_FACTOR_CONSTANT.MINIMUM_LIST_PAGES_COUNT,
		multipleOf: NUMBER_CONSTANT.ONE,
		type: EApiPropertyDataType.INTEGER,
		entity: entityMetadata,
		required: true,
	})(GeneratedDTO.prototype, 'page');
	}

	for (const property of markedProperties) {
		if ((dtoType === EApiDtoType.REQUEST && property.isPrimary) || (dtoType === EApiDtoType.QUERY && !property.isPrimary) || (dtoType !== EApiDtoType.REQUEST && dtoType !== EApiDtoType.QUERY)) {
			const decorators = buildDecorator(method, property.metadata, entityMetadata, dtoType, property.name);
			if (decorators) {
				decorators.forEach((decorator, index) => {
					if (property.metadata.type === EApiPropertyDescribeType.DATE &&
						method === EApiRouteType.GET_LIST &&
						dtoType === EApiDtoType.QUERY) {
						const dateProps = handleDateProperty(property.name, (property.metadata as TDatePropertyType).dataType);
						decorator(GeneratedDTO.prototype, dateProps[index].name);
					} else {
						decorator(GeneratedDTO.prototype, property.name);
					}
				});
			}
		}
	}

	Object.defineProperty(GeneratedDTO, "name", {
		value: `${entityMetadata.name}${CapitalizeString(method)}${CapitalizeString(dtoType)}DTO`,
	});

	return GeneratedDTO;
};
