import type { Type } from "@nestjs/common";
import type { IAuthGuard } from "@nestjs/passport";

import type { EApiPropertyDateIdentifier } from "../../enum";
import type { IApiEntity } from "../../interface";
import type { TApiPropertyDescribeDateProperties, TApiPropertyDescribeDtoProperties, TApiPropertyDescribeProperties, TDtoGenerateIsAllowedCombination } from "../../type";

import { EApiDtoType, EApiPropertyDescribeType, EApiRouteType } from "../../enum";

import { DtoGenerateDecorator } from "./generate-decorator.utility";
import { DtoGetDecoratorConfig } from "./get-decorator-config.utility";
import { DtoHandleDateProperty } from "./handle-date-property.utility";
import { DtoIsPropertyExposedForGuard } from "./is-property-exposed-for-guard.utility";

// eslint-disable-next-line @elsikora/typescript/no-unnecessary-type-parameters
export function DtoBuildDecorator<E, M extends EApiRouteType, D extends EApiDtoType>(method: M, propertyMetadata: TApiPropertyDescribeProperties, entity: IApiEntity<E>, dtoType: D, propertyName: string, currentGuard?: Type<IAuthGuard>): Array<PropertyDecorator> | undefined {
	type TAllowed = TDtoGenerateIsAllowedCombination<M, D>;

	type TPropertiesType = TAllowed extends true ? TApiPropertyDescribeDtoProperties : never;

	const properties: Record<D, TPropertiesType> | undefined = propertyMetadata.properties?.[method] as Record<D, TPropertiesType> | undefined;

	if (properties?.[dtoType]?.isEnabled === false || (properties?.[dtoType]?.isResponse && properties?.[dtoType]?.isExpose === false)) {
		return undefined;
	}

	if (!DtoIsPropertyExposedForGuard(method, propertyMetadata, dtoType, currentGuard)) {
		return undefined;
	}

	if (propertyMetadata.type === EApiPropertyDescribeType.DATE) {
		const dateMetadata: TApiPropertyDescribeDateProperties = propertyMetadata;

		if ((method === EApiRouteType.UPDATE || method === EApiRouteType.PARTIAL_UPDATE) && dtoType === EApiDtoType.BODY) {
			return undefined;
		}

		if (method === EApiRouteType.GET_LIST && dtoType === EApiDtoType.QUERY) {
			const dateProperties: Array<{ identifier: EApiPropertyDateIdentifier; name: string }> = DtoHandleDateProperty(propertyName, dateMetadata.identifier);

			return dateProperties.map((property: { identifier: EApiPropertyDateIdentifier; name: string }) => {
				const newMetadata: TApiPropertyDescribeProperties = { ...dateMetadata, identifier: property.identifier };
				const config: TApiPropertyDescribeDtoProperties = DtoGetDecoratorConfig(method, newMetadata, dtoType, property.name);

				return DtoGenerateDecorator(newMetadata, entity, config, method, dtoType, propertyName);
			});
		}
	}

	const config: TApiPropertyDescribeDtoProperties = DtoGetDecoratorConfig(method, propertyMetadata, dtoType, propertyName);

	return [DtoGenerateDecorator(propertyMetadata, entity, config, method, dtoType, propertyName)];
}
