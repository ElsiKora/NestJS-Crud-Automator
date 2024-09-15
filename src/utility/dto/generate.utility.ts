import { GET_LIST_QUERY_DTO_FACTORY_CONSTANT, NUMBER_CONSTANT, PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT } from "../../constant";
import { ApiPropertyNumber, ApiPropertyObject } from "../../decorator";

import { EApiDtoType, EApiPropertyDataType, EApiPropertyDescribeType, EApiRouteType } from "../../enum";

import { FilterOrderByFromEntity } from "../api";
import { CapitalizeString } from "../capitalize-string.utility";
import { ErrorException } from "../error-exception.utility";

import { DtoBuildDecorator } from "./build-decorator.utility";
import { DtoGetBaseClass } from "./get-base-class.utility";
import { DtoHandleDateProperty } from "./handle-date-property.utility";
import { DtoIsPropertyShouldBeMarked } from "./is-property-should-be-enabled.utility";
import { DtoIsShouldBeGenerated } from "./is-should-be-generated.utility";

import type { EApiPropertyDateType } from "../../enum";
import type { IApiEntity } from "../../interface";
import type { TApiPropertyDescribeProperties } from "../../type";
import type { Type } from "@nestjs/common";
import type { ObjectLiteral } from "typeorm";

export const DtoGenerate = (entity: ObjectLiteral, entityMetadata: IApiEntity, method: EApiRouteType, dtoType: EApiDtoType): Type<unknown> | undefined => {
	if (!DtoIsShouldBeGenerated(method, dtoType)) {
		return undefined;
	}

	if (!entityMetadata.primaryKey?.metadata?.[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_PROPERTY_NAME]) {
		throw ErrorException(`Primary key for entity ${entityMetadata.name} not found in metadata storage`);
	}

	const markedProperties: Array<{
		isPrimary: boolean;
		metadata: TApiPropertyDescribeProperties;
		name: string;
	}> = [];

	for (const column of entityMetadata.columns) {
		if (column.metadata?.[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_PROPERTY_NAME]) {
			markedProperties.push({
				isPrimary: column.isPrimary,
				metadata: column.metadata[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_PROPERTY_NAME] as TApiPropertyDescribeProperties,
				name: column.name,
			});
		}
	}

	const BaseClass: Type<any> = method === EApiRouteType.GET_LIST && dtoType === EApiDtoType.QUERY ? DtoGetBaseClass(entityMetadata) : class {};

	class GeneratedDTO extends BaseClass {
		constructor() {
			super();

			for (const property of markedProperties) {
				if (DtoIsPropertyShouldBeMarked(method, dtoType, property.name, property.metadata, property.isPrimary)) {
					if (property.metadata.type === EApiPropertyDescribeType.DATE && method === EApiRouteType.GET_LIST && dtoType === EApiDtoType.QUERY) {
						const dateProperties: Array<{ name: string; type: EApiPropertyDateType }> = DtoHandleDateProperty(property.name, property.metadata.dataType);

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
			}

			Object.defineProperty(this, "page", {
				configurable: true,
				enumerable: true,
				value: undefined,
				writable: true,
			});
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
		if (DtoIsPropertyShouldBeMarked(method, dtoType, property.name, property.metadata, property.isPrimary)) {
			const decorators: Array<PropertyDecorator> | undefined = DtoBuildDecorator(method, property.metadata, entityMetadata, dtoType, property.name);

			if (decorators) {
				for (const [index, decorator] of decorators.entries()) {
					if (property.metadata.type === EApiPropertyDescribeType.DATE && method === EApiRouteType.GET_LIST && dtoType === EApiDtoType.QUERY) {
						const dateProperties: Array<{ name: string; type: EApiPropertyDateType }> = DtoHandleDateProperty(property.name, property.metadata.dataType);
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
