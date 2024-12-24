import type { Type } from "@nestjs/common";
import type { IAuthGuard } from "@nestjs/passport";
import type { ObjectLiteral } from "typeorm";

import type { IApiControllerPropertiesRouteAutoDtoConfig, IApiEntity } from "../../interface";
import type { TApiPropertyDescribeProperties } from "../../type";

import { Validate } from "class-validator";

import { PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT } from "../../constant";
import { EApiDtoType, EApiRouteType } from "../../enum";
import { HasPairedCustomSuffixesFields } from "../../validator/has-paired-custom-suffixes-fields.validator";
import { CamelCaseString } from "../camel-case-string.utility";
import { ErrorException } from "../error-exception.utility";

import { DtoBuildDecorator } from "./build-decorator.utility";
import { DtoGenerateFilterDecorator } from "./generate-filter-decorator.utility";
import { DtoGenerateGetListResponse } from "./generate-get-list-response.utility";
import { DtoGetGetListQueryBaseClass } from "./get-get-list-query-base-class.utility";
import { DtoIsPropertyShouldBeMarked } from "./is-property-should-be-marked.utility";
import { DtoIsShouldBeGenerated } from "./is-should-be-generated.utility";

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
	const BaseClass: Type = method === EApiRouteType.GET_LIST && dtoType === EApiDtoType.QUERY ? DtoGetGetListQueryBaseClass<E>(entity, entityMetadata, method, dtoType) : class {};

	class GeneratedDTO extends BaseClass {
		constructor() {
			super();

			for (const property of markedProperties) {
				if (method === EApiRouteType.GET_LIST && dtoType === EApiDtoType.QUERY) {
					Object.defineProperty(this, `${property.name as string}[value]`, {
						configurable: true,
						enumerable: true,
						value: undefined,
						writable: true,
					});

					Object.defineProperty(this, `${property.name as string}[values]`, {
						configurable: true,
						enumerable: true,
						value: undefined,
						writable: true,
					});

					Object.defineProperty(this, `${property.name as string}[operator]`, {
						configurable: true,
						enumerable: true,
						value: undefined,
						writable: true,
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
		}
	}

	for (const property of markedProperties) {
		const decorators: Array<PropertyDecorator> | undefined = DtoBuildDecorator(method, property.metadata, entityMetadata, dtoType, property.name as string, currentGuard);

		if (decorators) {
			for (const [, decorator] of decorators.entries()) {
				if (method === EApiRouteType.GET_LIST && dtoType === EApiDtoType.QUERY) {
					decorator(GeneratedDTO.prototype, `${property.name as string}[value]`);

					DtoGenerateFilterDecorator(property.metadata, entityMetadata)(GeneratedDTO.prototype, `${property.name as string}[operator]`);
				} else {
					decorator(GeneratedDTO.prototype, property.name as string);
				}
			}
		}

		if (method === EApiRouteType.GET_LIST && dtoType === EApiDtoType.QUERY) {
			// @ts-ignore
			const metadataArray: TApiPropertyDescribeProperties = { ...property.metadata, isArray: true, isUniqueItems: false, maxItems: 100, minItems: 2 };

			const decoratorsArray: Array<PropertyDecorator> | undefined = DtoBuildDecorator(method, metadataArray, entityMetadata, dtoType, property.name as string, currentGuard);

			if (decoratorsArray) {
				for (const [, decorator] of decoratorsArray.entries()) {
					decorator(GeneratedDTO.prototype, `${property.name as string}[values]`);
				}
			}
		}
	}

	if (dtoConfig?.validators) {
		for (const validator of dtoConfig.validators) {
			Validate(validator.constraintClass as unknown as Function, validator.options)(GeneratedDTO.prototype, "object");
		}
	}

	if (method === EApiRouteType.GET_LIST && dtoType === EApiDtoType.QUERY) {
		Object.defineProperty(GeneratedDTO.prototype, "object", {
			configurable: true,
			enumerable: true,
			value: function (this: InstanceType<typeof GeneratedDTO>): InstanceType<typeof GeneratedDTO> {
				return this;
			},
			writable: true,
		});

		Validate(HasPairedCustomSuffixesFields, ["operator", ["value", "values"]])(GeneratedDTO.prototype, "object");
	}

	Object.defineProperty(GeneratedDTO, "name", {
		value: `${entityMetadata.name}${CamelCaseString(method)}${CamelCaseString(dtoType)}DTO`,
	});

	if (method === EApiRouteType.GET_LIST && dtoType === EApiDtoType.RESPONSE) {
		// @ts-ignore
		return DtoGenerateGetListResponse(entity, GeneratedDTO);
	} else {
		return GeneratedDTO;
	}
}
