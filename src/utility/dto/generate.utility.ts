import { Validate } from "class-validator";

import { GET_LIST_QUERY_DTO_FACTORY_CONSTANT, NUMBER_CONSTANT, PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT } from "../../constant";
import { ApiPropertyNumber, ApiPropertyObject } from "../../decorator";

import { EApiDtoType, EApiPropertyDataType, EApiPropertyDescribeType, EApiRouteType } from "../../enum";

import { FilterOrderByFromEntity } from "../api";
import { CapitalizeString } from "../capitalize-string.utility";
import { ErrorException } from "../error-exception.utility";

import { DtoBuildDecorator } from "./build-decorator.utility";
import { DtoGetBaseClass } from "./get-base-class.utility";
import { DtoHandleDateProperty } from "./handle-date-property.utility";
import { DtoIsPropertyShouldBeMarked } from "./is-property-should-be-marked.utility";
import { DtoIsShouldBeGenerated } from "./is-should-be-generated.utility";

import type { EApiPropertyDateType } from "../../enum";
import type { IApiControllerPropertiesRouteAutoDtoConfig, IApiEntity } from "../../interface";
import type { TApiPropertyDescribeProperties } from "../../type";
import type { Type } from "@nestjs/common";
import type { IAuthGuard } from "@nestjs/passport";
import type { ObjectLiteral } from "typeorm";

export function DtoGenerate<E>(entity: ObjectLiteral, entityMetadata: IApiEntity<E>, method: EApiRouteType, dtoType: EApiDtoType, dtoConfig?: IApiControllerPropertiesRouteAutoDtoConfig, currentGuard?: Type<IAuthGuard>): Type<unknown> | undefined {
	if (!DtoIsShouldBeGenerated(method, dtoType)) {
		return undefined;
	}

	if (!entityMetadata.primaryKey?.metadata?.[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_PROPERTY_NAME]) {
		throw ErrorException(`Primary key for entity ${entityMetadata.name} not found in metadata storage`);
	}

	const markedProperties: Array<{
		isPrimary: boolean;
		metadata: TApiPropertyDescribeProperties;
		name: keyof E;
	}> = [];

	for (const column of entityMetadata.columns) {
		if (column.metadata?.[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_PROPERTY_NAME] && DtoIsPropertyShouldBeMarked(method, dtoType, column.name as string, column.metadata[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_PROPERTY_NAME] as TApiPropertyDescribeProperties, column.isPrimary, currentGuard)) {
			markedProperties.push({
				isPrimary: column.isPrimary,
				metadata: column.metadata[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_PROPERTY_NAME] as TApiPropertyDescribeProperties,
				name: column.name,
			});
		}
	}

	console.log("MARKEED", dtoType, method, markedProperties, currentGuard);

	const BaseClass: Type<any> = method === EApiRouteType.GET_LIST && dtoType === EApiDtoType.QUERY ? DtoGetBaseClass<E>(entityMetadata) : class {};

	class GeneratedDTO extends BaseClass {
		constructor() {
			super();

			for (const property of markedProperties) {
				if (property.metadata.type === EApiPropertyDescribeType.DATE && method === EApiRouteType.GET_LIST && dtoType === EApiDtoType.QUERY) {
					const dateProperties: Array<{ name: string; type: EApiPropertyDateType }> = DtoHandleDateProperty(property.name as string, property.metadata.dataType);

					for (const dateProperty of dateProperties) {
						Object.defineProperty(this, dateProperty.name, {
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

			/* Object.defineProperty(this, "page", { /// TODO ?????? ZACHEM PROVERIT
				configurable: true,
				enumerable: true,
				value: undefined,
				writable: true,
			});*/
		}
	}

	if (method === EApiRouteType.GET_LIST && dtoType === EApiDtoType.QUERY) {
		ApiPropertyObject({
			description: "order by field",
			entity: entityMetadata,
			enum: FilterOrderByFromEntity(entity, entityMetadata, method, dtoType),
			required: false,
		})(GeneratedDTO.prototype, "orderBy");

		ApiPropertyNumber({
			description: "Page to return",
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
		const decorators: Array<PropertyDecorator> | undefined = DtoBuildDecorator(method, property.metadata, entityMetadata, dtoType, property.name as string, currentGuard);

		if (decorators) {
			for (const [index, decorator] of decorators.entries()) {
				if (property.metadata.type === EApiPropertyDescribeType.DATE && method === EApiRouteType.GET_LIST && dtoType === EApiDtoType.QUERY) {
					const dateProperties: Array<{ name: string; type: EApiPropertyDateType }> = DtoHandleDateProperty(property.name as string, property.metadata.dataType);
					decorator(GeneratedDTO.prototype, dateProperties[index].name);
				} else {
					decorator(GeneratedDTO.prototype, property.name as string);
				}
			}
		}
	}

	if (dtoConfig?.validators) {
		for (const validator of dtoConfig.validators) {
			Validate(validator.constraintClass as unknown as Function, validator.options)(GeneratedDTO.prototype, "object");
		}
	}

	Object.defineProperty(GeneratedDTO, "name", {
		value: `${entityMetadata.name}${CapitalizeString(method)}${CapitalizeString(dtoType)}DTO`,
	});

	return GeneratedDTO;
}
