import { EApiDtoType, EApiPropertyDescribeType, EApiRouteType } from "../../enum";

import { DtoGenerateDecorator } from "./generate-decorator.utility";
import { DtoGetDecoratorConfig } from "./get-decorator-config.utility";
import { DtoHandleDateProperty } from "./handle-date-property.utility";

import { DtoIsPropertyExposedForGuard } from "./is-property-exposed-for-guard.utility";

import type { EApiPropertyDateType } from "../../enum";
import type { IApiEntity } from "../../interface";
import type { TApiPropertyDescribeArrayOptionalProperties, TApiPropertyDescribeArrayRequiredProperties, TApiPropertyDescribeBaseProperties, TApiPropertyDescribeDtoProperties, TApiPropertyDescribeProperties, TDtoGenerateIsAllowedCombination } from "../../type";
import type { Type } from "@nestjs/common";
import type { IAuthGuard } from "@nestjs/passport";

export function DtoBuildDecorator<E, M extends EApiRouteType, D extends EApiDtoType>(method: M, propertyMetadata: TApiPropertyDescribeProperties, entity: IApiEntity<E>, dtoType: D, propertyName: string, currentGuard?: Type<IAuthGuard>): Array<PropertyDecorator> | undefined {
	type TAllowed = TDtoGenerateIsAllowedCombination<M, D>;

	type TPropertiesType = TAllowed extends true ? TApiPropertyDescribeDtoProperties : never;

	const properties: Record<D, TPropertiesType> | undefined = propertyMetadata.properties?.[method] as Record<D, TPropertiesType> | undefined;

	if (properties?.[dtoType]?.enabled === false || properties?.[dtoType]?.expose === false) {
		return undefined;
	}

	if (!DtoIsPropertyExposedForGuard(method, propertyMetadata, dtoType, currentGuard)) {
		console.log("DONT WANT MARKER", propertyName, method, dtoType, propertyMetadata);

		return undefined;
	}

	if (propertyMetadata.type === EApiPropertyDescribeType.DATE) {
		const dateMetadata:
			| (TApiPropertyDescribeBaseProperties & {
					dataType: EApiPropertyDateType;
					type: EApiPropertyDescribeType.DATE;
			  } & TApiPropertyDescribeArrayOptionalProperties)
			| (TApiPropertyDescribeBaseProperties & {
					dataType: EApiPropertyDateType;
					type: EApiPropertyDescribeType.DATE;
			  } & TApiPropertyDescribeArrayRequiredProperties) = propertyMetadata;

		if ((method === EApiRouteType.UPDATE || method === EApiRouteType.PARTIAL_UPDATE) && dtoType === EApiDtoType.BODY) {
			return undefined;
		}

		if (method === EApiRouteType.GET_LIST && dtoType === EApiDtoType.QUERY) {
			const dateProperties: Array<{ name: string; type: EApiPropertyDateType }> = DtoHandleDateProperty(propertyName, dateMetadata.dataType);

			return dateProperties.map((property: { name: string; type: EApiPropertyDateType }) => {
				const newMetadata: TApiPropertyDescribeProperties = { ...dateMetadata, dataType: property.type };
				const config: TApiPropertyDescribeDtoProperties = DtoGetDecoratorConfig(method, newMetadata, dtoType, property.name);

				return DtoGenerateDecorator(newMetadata, entity, config, method, dtoType, propertyName);
			});
		}
	}

	const config: TApiPropertyDescribeDtoProperties = DtoGetDecoratorConfig(method, propertyMetadata, dtoType, propertyName);

	return [DtoGenerateDecorator(propertyMetadata, entity, config, method, dtoType, propertyName)];
}
